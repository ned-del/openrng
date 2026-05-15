/**
 * OpenRNG LangChain Demo
 *
 * Demonstrates an AI agent using OpenRNG tools to make a provably fair
 * decision — e.g. picking a random winner from a list of contestants.
 *
 * Prerequisites:
 *   1. OpenRNG server running (npm run dev)
 *   2. API_SECRET set in .env
 *   3. OPENAI_API_KEY set (or swap to any LangChain-supported LLM)
 *
 * Run:
 *   npx ts-node demo.ts
 */

import { createOpenRNGTools } from './openrng-tool';

async function main() {
  const apiUrl = process.env.OPENRNG_API_URL || 'http://localhost:3000';
  const apiKey = process.env.OPENRNG_API_KEY || process.env.API_SECRET || '';

  if (!apiKey) {
    console.error('❌ Set OPENRNG_API_KEY or API_SECRET in your environment');
    process.exit(1);
  }

  // Create the OpenRNG tools
  const tools = createOpenRNGTools({ apiUrl, apiKey });

  console.log('🎲 OpenRNG LangChain Tools Demo\n');
  console.log('Available tools:');
  tools.forEach((t) => console.log(`  • ${t.name}: ${t.description.slice(0, 80)}...`));
  console.log();

  // ── Demo 1: Generate random numbers ─────────────────────
  console.log('━━━ Demo 1: Generate 3 random numbers (1-100) ━━━');
  const randomResult = await tools[0].invoke(
    JSON.stringify({ min: 1, max: 100, quantity: 3 }),
  );
  const randomData = JSON.parse(randomResult);
  console.log(`Numbers: ${JSON.stringify(randomData.values)}`);
  if (randomData.proofs?.[0]) {
    console.log(`Proof (first): leaf_hash=${randomData.proofs[0].leaf_hash?.slice(0, 16)}...`);
    console.log(`  PolygonScan: ${randomData.proofs[0].polygon_scan || 'pending anchor'}`);
  }
  console.log();

  // ── Demo 2: Make a provably fair choice ─────────────────
  console.log('━━━ Demo 2: Provably fair raffle winner ━━━');
  const contestants = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
  const choiceResult = await tools[1].invoke(
    JSON.stringify({ options: contestants }),
  );
  const choiceData = JSON.parse(choiceResult);
  console.log(`Contestants: ${contestants.join(', ')}`);
  console.log(`🏆 Winner: ${choiceData.selected}`);
  console.log(`Proof: leaf_hash=${choiceData.proof?.leaf_hash?.slice(0, 16)}...`);
  console.log();

  // ── Demo 3: Verify a proof ──────────────────────────────
  if (randomData.proofs?.[0]?.leaf_hash && randomData.proofs[0].batch_id) {
    console.log('━━━ Demo 3: Verify proof on-chain ━━━');
    const verifyResult = await tools[2].invoke(
      JSON.stringify({
        leaf_hash: randomData.proofs[0].leaf_hash,
        batch_id: randomData.proofs[0].batch_id,
      }),
    );
    const verifyData = JSON.parse(verifyResult);
    console.log(`Verified: ${verifyData.verified}`);
    if (verifyData.batch?.polygon_scan) {
      console.log(`PolygonScan: ${verifyData.batch.polygon_scan}`);
    }
    console.log();
  }

  // ── How to use with an LLM Agent ───────────────────────
  console.log('━━━ Using with a LangChain Agent ━━━');
  console.log(`
To use these tools with an LLM agent:

  import { ChatOpenAI } from '@langchain/openai';
  import { createReactAgent } from '@langchain/langgraph/prebuilt';
  import { createOpenRNGTools } from './openrng-tool';

  const llm = new ChatOpenAI({ model: 'gpt-4o' });
  const tools = createOpenRNGTools({
    apiUrl: 'http://localhost:3000',
    apiKey: process.env.OPENRNG_API_KEY!,
  });

  const agent = createReactAgent({ llm, tools });

  const result = await agent.invoke({
    messages: [{ role: 'user', content: 'Pick a random number 1-6 like rolling a die' }],
  });
`);

  console.log('✅ Demo complete!');
}

main().catch((err) => {
  console.error('Demo failed:', err.message);
  process.exit(1);
});
