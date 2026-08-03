"""
Provably Fair Selection in ~30 Lines
Using OpenRNG commit/reveal — prove the winner wasn't chosen after the fact.

Run: python3 fair_selection.py
Requires: Python 3.8+ (uses only stdlib)
"""

import hashlib, json, time
from urllib import request

BASE_URL   = 'https://x402.openrng.io/v1/rng'
CANDIDATES = ['alice', 'bob', 'charlie', 'diana', 'evan']
DOMAIN     = 'grant-round-12'

# ── Step 1: Hash the candidate set (commit to it before seeing any randomness) ──
candidate_hash = hashlib.sha256(','.join(CANDIDATES).encode()).hexdigest()

# ── Step 2: Commit to a future epoch ──
body = json.dumps({'epoch_offset': 3, 'candidate_set_hash': candidate_hash, 'domain': DOMAIN}).encode()
req  = request.Request(f'{BASE_URL}/commit', data=body, headers={'Content-Type': 'application/json'})
commitment = json.loads(request.urlopen(req).read())
print(f"📋 Commitment receipt: id={commitment['commitment_id']}  epoch={commitment['committed_epoch']}")

# ── Step 3: Share this receipt publicly BEFORE randomness is revealed ──
# Anyone holding this can later verify the candidates were locked at commit time.
print(f"🔗 Shareable proof-of-commit: {json.dumps({'id': commitment['commitment_id'], 'candidateSetHash': candidate_hash, 'domain': DOMAIN})}")

# ── Step 4: Wait for epoch maturity (VDF runs sequentially — nobody could preview it) ──
print(f"⏳ Waiting ~{commitment['estimated_ready_seconds']}s for epoch {commitment['committed_epoch']}…")
time.sleep(commitment['estimated_ready_seconds'] + 2)

# ── Step 5: Poll until revealed, then verify locally ──
for _ in range(15):                                       # poll up to ~30s
    reveal = json.loads(request.urlopen(f"{BASE_URL}/reveal/{commitment['commitment_id']}").read())
    if 'verification' in reveal:
        break
    time.sleep(2)

assert reveal['verification']['commitment_hash_verified'], 'Hash mismatch — reject this result'
assert reveal['verification']['temporal_valid'],          'Temporal order invalid — reject this result'
print(f"✅ Verified: {reveal['verification']['temporal_note']}")

# ── Step 6: Derive winner from verified randomness ──
idx    = int(reveal['value'], 16) % len(CANDIDATES)
winner = CANDIDATES[idx]
print(f"🏆 Winner: {winner} (index {idx} of {len(CANDIDATES)})")
print(f"🔍 Anyone can verify independently: {reveal['verification']['verify_url']}")
