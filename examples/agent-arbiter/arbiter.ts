/**
 * Agent Arbiter
 *
 * Three AI agents compete for tasks.
 * Every assignment is backed by a Verifiable Entropy Object.
 * Every assignment is independently auditable.
 *
 * This is the difference between:
 *   "Trust me, the assignment was fair."
 * and:
 *   "Here's the cryptographic proof. Verify it yourself."
 *
 * Usage:
 *   npx ts-node arbiter.ts
 *   npx ts-node arbiter.ts --audit
 */

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

const OPENRNG_API = process.env.OPENRNG_API || 'http://localhost:3000';

const AGENTS = ['agent-alpha', 'agent-beta', 'agent-gamma'];

const TASKS = [
  'Summarize Q2 earnings report',
  'Draft customer reply for ticket #4021',
  'Research competitor pricing',
  'Generate social media post',
  'Review pull request #187',
];

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface VEO {
  standard: string;
  object_id: string;
  object_class: string;
  entropy: string;
  entropy_hash: string;
  issued_at: string;
  sources: Array<{ source_id: string; source_reference?: string }>;
  confidence: { score: number; grade: string; source_status?: string };
  proof: { proof_status?: string; provider_address?: string; provider_signature?: string };
  anchor?: { transaction_hash?: string; chain?: string } | null;
}

interface Assignment {
  task: string;
  agent: string;
  veo_object_id: string;
  entropy: string;
  ecs_score: number;
  ecs_grade: string;
  proof_status: string;
  anchor_tx: string | null;
  verify_url: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════
// CORE: FAIR ASSIGNMENT
// ═══════════════════════════════════════════════════════════

async function getVEO(): Promise<VEO> {
  const res = await fetch(`${OPENRNG_API}/v2/entropy`);
  if (!res.ok) throw new Error(`OpenRNG API error: ${res.status}`);
  return res.json();
}

function deriveAgent(entropy: string, agents: string[]): { agent: string; index: number } {
  // Use first 8 hex chars of entropy to pick agent
  const value = parseInt(entropy.slice(2, 10), 16);
  const index = value % agents.length;
  return { agent: agents[index], index };
}

async function assignTask(task: string): Promise<Assignment> {
  const veo = await getVEO();
  const { agent } = deriveAgent(veo.entropy, AGENTS);

  return {
    task,
    agent,
    veo_object_id: veo.object_id,
    entropy: veo.entropy,
    ecs_score: veo.confidence.score,
    ecs_grade: veo.confidence.grade,
    proof_status: veo.proof?.proof_status || 'unsigned',
    anchor_tx: veo.anchor?.transaction_hash || null,
    verify_url: `https://verify.openrng.io`,
    timestamp: veo.issued_at,
  };
}

// ═══════════════════════════════════════════════════════════
// AUDIT: INDEPENDENT VERIFICATION
// ═══════════════════════════════════════════════════════════

async function auditAssignment(assignment: Assignment): Promise<void> {
  console.log(`\n  Auditing: "${assignment.task}"`);
  console.log(`  Claimed agent: ${assignment.agent}`);

  // Step 1: Re-derive the agent from the entropy
  const { agent: derived } = deriveAgent(assignment.entropy, AGENTS);
  const match = derived === assignment.agent;
  console.log(`  Re-derived agent: ${derived} ${match ? '✓ MATCH' : '✕ MISMATCH'}`);

  // Step 2: Verify the VEO via API
  const res = await fetch(`${OPENRNG_API}/v2/entropy/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entropy_object: await getStoredVEO(assignment.veo_object_id) }),
  });

  if (res.ok) {
    const result = await res.json();
    console.log(`  Verification: ${result.verification_level}`);
    console.log(`  Hash: ${result.checks.hash ? '✓' : '✕'} | Signature: ${result.checks.signature === true ? '✓' : result.checks.signature === null ? '—' : '✕'} | Sources: ${result.checks.sources ? '✓' : '✕'}`);
  } else {
    console.log(`  Verification: API error ${res.status}`);
  }

  // Step 3: Show blockchain proof if anchored
  if (assignment.anchor_tx) {
    console.log(`  Anchor: https://amoy.polygonscan.com/tx/${assignment.anchor_tx}`);
  }
}

// Simple in-memory VEO store for audit lookup
const veoStore = new Map<string, VEO>();

async function getStoredVEO(objectId: string): Promise<VEO | null> {
  return veoStore.get(objectId) || null;
}

// Modified assignTask that also stores the full VEO
async function assignTaskWithStore(task: string): Promise<Assignment> {
  const veo = await getVEO();
  veoStore.set(veo.object_id, veo);
  const { agent } = deriveAgent(veo.entropy, AGENTS);

  return {
    task,
    agent,
    veo_object_id: veo.object_id,
    entropy: veo.entropy,
    ecs_score: veo.confidence.score,
    ecs_grade: veo.confidence.grade,
    proof_status: veo.proof?.proof_status || 'unsigned',
    anchor_tx: veo.anchor?.transaction_hash || null,
    verify_url: `https://verify.openrng.io`,
    timestamp: veo.issued_at,
  };
}

// ═══════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════

function printAssignment(a: Assignment, i: number) {
  const sig = a.proof_status === 'cryptographically_signed' ? '🔏 signed' :
              a.proof_status === 'unsigned' ? '📝 unsigned' : a.proof_status;
  const anchor = a.anchor_tx ? '⛓ anchored' : '  unanchored';
  const grade = { AAA: '🟢', AA: '🟢', A: '🔵', B: '🟡', C: '🟠', LOW: '🔴' }[a.ecs_grade] || '⚪';

  console.log(`
  ┌─ Assignment #${i + 1} ────────────────────────────────────
  │ Task:    ${a.task}
  │ Agent:   ${a.agent}
  │ ECS:     ${grade} ${a.ecs_score} (${a.ecs_grade})  ${sig}  ${anchor}
  │ Entropy: ${a.entropy.slice(0, 18)}...
  │ VEO:     ${a.veo_object_id}
  │ Verify:  ${a.verify_url}
  └──────────────────────────────────────────────────────────`);
}

function printComparison(assignments: Assignment[]) {
  // Count assignments per agent
  const counts: Record<string, number> = {};
  for (const a of assignments) {
    counts[a.agent] = (counts[a.agent] || 0) + 1;
  }

  console.log('\n  ── Distribution ──────────────────────────────');
  for (const agent of AGENTS) {
    const n = counts[agent] || 0;
    const bar = '█'.repeat(n * 4) + '░'.repeat((assignments.length - n) * 4);
    console.log(`  ${agent.padEnd(14)} ${bar} ${n}/${assignments.length}`);
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  const isAudit = process.argv.includes('--audit');

  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║  Agent Arbiter — Verifiable Task Assignment             ║
  ║  Every assignment is backed by a VEO-1 entropy object.  ║
  ╚══════════════════════════════════════════════════════════╝
  
  API: ${OPENRNG_API}
  Agents: ${AGENTS.join(', ')}
  Tasks: ${TASKS.length}
  `);

  // Assign all tasks
  const assignments: Assignment[] = [];
  for (const task of TASKS) {
    try {
      const a = await assignTaskWithStore(task);
      assignments.push(a);
      printAssignment(a, assignments.length - 1);
    } catch (err: any) {
      console.error(`  ✕ Failed to assign "${task}": ${err.message}`);
    }
  }

  printComparison(assignments);

  // Audit mode: verify every assignment
  if (isAudit) {
    console.log('\n  ══ AUDIT MODE ═══════════════════════════════════');
    console.log('  Re-deriving agents and verifying entropy objects...\n');
    for (const a of assignments) {
      await auditAssignment(a);
    }
  }

  // The point
  console.log(`
  ── Why This Matters ─────────────────────────────────────

  With Math.random():
    "Agent-beta was assigned. Trust me."

  With OpenRNG VEO-1:
    "Agent-beta was assigned.
     Entropy: 0x${assignments[0]?.entropy.slice(2, 10) || '...'}... from drand + Bitcoin + Polygon.
     ECS: ${assignments[0]?.ecs_score || '...'} (${assignments[0]?.ecs_grade || '...'}).
     Signed by 0xD4F7...
     Verify: ${assignments[0]?.verify_url || '...'}"

  The assignment is the same.
  The proof is the difference.
  `);
}

main().catch(console.error);
