import { auto, MemoryStore } from '../index';
import { generateSigningKeys, verifySignature } from '@fairseal/core';

// Mock OpenAI-like client
function createMockOpenAI() {
  return {
    chat: {
      completions: {
        create: async (params: any) => ({
          id: 'chatcmpl-abc123',
          choices: [{
            message: {
              role: 'assistant',
              content: 'The capital of France is Paris.',
              tool_calls: params.tools ? [{
                id: 'call_1',
                function: { name: 'search', arguments: '{}' },
              }] : undefined,
            },
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18,
          },
          model: params.model || 'gpt-4o',
        }),
      },
    },
  };
}

// Mock Anthropic-like client
function createMockAnthropic() {
  return {
    messages: {
      create: async (params: any) => ({
        content: [{ type: 'text', text: 'Hello from Claude.' }],
        usage: { input_tokens: 12, output_tokens: 5 },
        model: params.model || 'claude-4-sonnet',
      }),
    },
  };
}

describe('@fairseal/auto', () => {
  test('wraps OpenAI client and emits VEO on chat.completions.create', async () => {
    const store = new MemoryStore();
    const client = auto(createMockOpenAI(), { store, provider: 'test' });

    const result = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'What is the capital of France?' }],
    });

    // Original response preserved
    expect(result.choices[0].message.content).toBe('The capital of France is Paris.');

    // VEO emitted
    const veos = store.list();
    expect(veos).toHaveLength(1);
    expect(veos[0].execution?.model_id).toBe('gpt-4o');
    expect(veos[0].confidence.score).toBe(700);
    expect(veos[0].execution?.cost?.total_tokens).toBe(18);
  });

  test('wraps Anthropic client and emits VEO on messages.create', async () => {
    const store = new MemoryStore();
    const client = auto(createMockAnthropic(), { store });

    const result = await client.messages.create({
      model: 'claude-4-sonnet',
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result.content[0].text).toBe('Hello from Claude.');
    const veos = store.list();
    expect(veos).toHaveLength(1);
    expect(veos[0].execution?.model_id).toBe('claude-4-sonnet');
  });

  test('signs VEOs when privateKey is provided', async () => {
    const keys = generateSigningKeys();
    const store = new MemoryStore();
    const client = auto(createMockOpenAI(), {
      store,
      privateKey: keys.privateKey,
    });

    await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test' }],
    });

    const veo = store.list()[0];
    expect(veo.proof?.algorithm).toBe('Ed25519');
    expect(veo.proof?.provider_signature).toBeDefined();
    expect(verifySignature(veo, keys.publicKey)).toBe(true);
  });

  test('calls onVEO callback', async () => {
    const captured: any[] = [];
    const client = auto(createMockOpenAI(), {
      onVEO: (veo) => { captured.push(veo); },
    });

    await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(captured).toHaveLength(1);
    expect(captured[0].object_class).toBe('VEO-2A');
  });

  test('captures tool calls', async () => {
    const store = new MemoryStore();
    const client = auto(createMockOpenAI(), { store });

    await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'search something' }],
      tools: [{ type: 'function', function: { name: 'search' } }],
    });

    const veo = store.list()[0];
    expect(veo.execution?.tool_calls).toHaveLength(1);
    expect(veo.execution?.tool_calls?.[0].tool_id).toBe('search');
  });

  test('handles errors without breaking the original call', async () => {
    const errorClient = {
      chat: {
        completions: {
          create: async () => { throw new Error('API error'); },
        },
      },
    };

    const store = new MemoryStore();
    const client = auto(errorClient, { store });

    await expect(
      (client.chat.completions.create as any)({ model: 'gpt-4o', messages: [] })
    ).rejects.toThrow('API error');

    // VEO still emitted for the error
    const veos = store.list();
    expect(veos).toHaveLength(1);
    expect(veos[0].confidence.score).toBe(100); // low confidence for errors
  });

  test('never breaks the original API call even if VEO emission fails', async () => {
    const badStore = {
      save: () => { throw new Error('store broken'); },
      list: () => [],
      get: () => undefined,
    };

    const client = auto(createMockOpenAI(), { store: badStore });

    // Should still work despite broken store
    const result = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'test' }],
    });
    expect(result.choices[0].message.content).toBe('The capital of France is Paris.');
  });

  // Bug 1 fix: private fields on non-instrumented methods
  test('non-instrumented methods work with private fields', async () => {
    // Simulate SDK with private-field-like behavior
    class MockSDK {
      private secret: string = 'hidden';
      chat = { completions: {
        create: async (p: any) => ({ choices: [{ message: { content: 'ok' } }], model: p.model }),
      }};
      getSecret() { return this.secret; }
      files = { list: async () => ({ data: ['file1'] }) };
    }

    const store = new MemoryStore();
    const client = auto(new MockSDK() as any, { store });

    // Non-instrumented method should work (no private field crash)
    const secret = client.getSecret();
    expect(secret).toBe('hidden');

    // Instrumented method still works
    await client.chat.completions.create({ model: 'gpt-4o', messages: [] });
    expect(store.list()).toHaveLength(1);
  });

  // Bug 2 fix: streaming detection
  test('streaming response marked honestly, not captured as junk', async () => {
    const streamClient = {
      chat: { completions: {
        create: async () => {
          // Return async iterable (simulating SSE stream)
          return {
            [Symbol.asyncIterator]: async function* () {
              yield { choices: [{ delta: { content: 'hello' } }] };
              yield { choices: [{ delta: { content: ' world' } }] };
            },
          };
        },
      }},
    };

    const store = new MemoryStore();
    const client = auto(streamClient, { store });
    const stream = await (client.chat.completions.create as any)({ model: 'gpt-4o', messages: [], stream: true });

    // Stream should still be consumable
    const chunks: any[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(chunks).toHaveLength(2);

    // Wait for fire-and-forget VEO
    await new Promise(r => setTimeout(r, 50));
    const veos = store.list();
    expect(veos).toHaveLength(1);
    // Confidence lowered for stream
    expect(veos[0].confidence.score).toBe(300);
    // Output honestly marked
    expect(veos[0].metadata?.stream).toBe(true);
  });

  // Bug 3 fix: fire-and-forget by default
  test('onVEO does not block the caller by default', async () => {
    let callbackDone = false;
    const client = auto(createMockOpenAI(), {
      onVEO: async () => {
        await new Promise(r => setTimeout(r, 200));
        callbackDone = true;
      },
    });

    const start = Date.now();
    await client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: 'test' }] });
    const elapsed = Date.now() - start;

    // Should NOT have waited for the 200ms callback
    expect(elapsed).toBeLessThan(100);
    expect(callbackDone).toBe(false);

    // Callback completes later
    await new Promise(r => setTimeout(r, 300));
    expect(callbackDone).toBe(true);
  });

  test('awaitCapture: true blocks until VEO is saved', async () => {
    let saved = false;
    const client = auto(createMockOpenAI(), {
      awaitCapture: true,
      onVEO: async () => {
        await new Promise(r => setTimeout(r, 50));
        saved = true;
      },
    });

    await client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: 'test' }] });
    expect(saved).toBe(true); // waited for callback
  });

  test('multiple calls produce multiple VEOs', async () => {
    const store = new MemoryStore();
    const client = auto(createMockOpenAI(), { store });

    await client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: 'a' }] });
    await client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: 'b' }] });
    await client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: 'c' }] });

    expect(store.list()).toHaveLength(3);
    // Each has unique ID
    const ids = store.list().map(v => v.object_id);
    expect(new Set(ids).size).toBe(3);
  });
});
