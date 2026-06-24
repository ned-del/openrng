/**
 * OpenRNG VEO-1 Verifier — Client-Side Verification
 *
 * Performs full VEO-1 verification in the browser:
 * - Schema validation
 * - Hash verification (SHA-256)
 * - Provider signature verification (secp256k1 EIP-191)
 * - Anchor display + PolygonScan links
 * - ECS visualization
 */

// ═══════════════════════════════════════════════════════════
// VERIFICATION ENGINE
// ═══════════════════════════════════════════════════════════

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function deepSortKeys(obj) {
  if (obj === null) return null;
  if (obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(deepSortKeys);
  if (typeof obj !== 'object') return obj;
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    const val = obj[key];
    if (val === undefined) return;
    sorted[key] = deepSortKeys(val);
  });
  return sorted;
}

function canonicalizeVEO(veo) {
  const canonical = {
    standard: veo.standard,
    version: veo.version,
    object_id: veo.object_id,
    object_class: veo.object_class,
    entropy: veo.entropy,
    entropy_hash: veo.entropy_hash,
    issued_at: veo.issued_at,
    expires_at: veo.expires_at ?? null,
    provider: veo.provider,
    sources: veo.sources,
    aggregation: veo.aggregation ?? null,
    confidence: veo.confidence,
    lineage: veo.lineage ?? null,
    policy: veo.policy ?? null,
    anchor: null,
  };
  return JSON.stringify(deepSortKeys(canonical));
}

function isRealSignature(sig) {
  if (!sig) return false;
  const placeholders = ['TODO', 'TODO_SIGN_CANONICAL_OBJECT', '', 'unsigned'];
  return !placeholders.includes(sig) && sig.startsWith('0x') && sig.length > 10;
}

async function verifyVEO(veo) {
  const result = {
    valid: true,
    verification_level: 'structurally_valid_unsigned',
    checks: { schema: true, hash: true, signature: null, sources: true, confidence: true, anchor: null, lineage: null, policy: true },
    statuses: { proof_status: 'unsigned', anchor_status: 'unanchored', source_status: 'live', policy_status: 'not_applicable' },
    errors: [],
  };

  // Schema
  if (veo.standard !== 'VEO-1') {
    result.checks.schema = false;
    result.errors.push('VEO_SCHEMA_INVALID: standard must be VEO-1');
  }
  if (!veo.entropy || !veo.entropy_hash || !veo.sources || !veo.confidence) {
    result.checks.schema = false;
    result.errors.push('VEO_SCHEMA_INVALID: required fields missing');
  }

  // Hash
  const expectedHash = await sha256Hex(veo.entropy.toLowerCase());
  if (expectedHash !== veo.entropy_hash.toLowerCase()) {
    result.checks.hash = false;
    result.errors.push('VEO_HASH_MISMATCH');
  }

  // Sources
  if (!Array.isArray(veo.sources) || veo.sources.length < 1) {
    result.checks.sources = false;
    result.errors.push('VEO_SOURCE_INVALID: no sources');
  }

  // Confidence
  if (veo.confidence.score < 0 || veo.confidence.score > 1000) {
    result.checks.confidence = false;
    result.errors.push('VEO_CONFIDENCE_INVALID');
  }

  // Source status
  result.statuses.source_status = veo.confidence.source_status || 'live';

  // Signature verification
  const hasSig = isRealSignature(veo.proof?.provider_signature);
  const hasAddr = veo.proof?.provider_address && veo.proof.provider_address !== 'TODO';

  if (hasSig && hasAddr) {
    try {
      const canonical = canonicalizeVEO(veo);
      const payloadHash = await sha256Hex(canonical);
      const recovered = ethers.verifyMessage(payloadHash, veo.proof.provider_signature);
      if (recovered.toLowerCase() === veo.proof.provider_address.toLowerCase()) {
        result.checks.signature = true;
        result.statuses.proof_status = 'cryptographically_verified';
      } else {
        result.checks.signature = false;
        result.statuses.proof_status = 'invalid_signature';
        result.errors.push('VEO_SIGNATURE_INVALID: recovered address mismatch');
      }
    } catch (e) {
      result.checks.signature = false;
      result.statuses.proof_status = 'invalid_signature';
      result.errors.push('VEO_SIGNATURE_INVALID: ' + e.message);
    }
  } else {
    result.checks.signature = null;
    result.statuses.proof_status = 'unsigned';
  }

  // Anchor
  const hasAnchor = veo.anchor && veo.anchor.transaction_hash && veo.anchor.contract;
  if (hasAnchor) {
    result.checks.anchor = true; // structural — on-chain readback requires RPC
    result.statuses.anchor_status = 'anchored';
  }

  // Determine verification level
  const structOk = result.checks.schema && result.checks.hash && result.checks.sources && result.checks.confidence;

  if (!structOk || result.statuses.proof_status === 'invalid_signature') {
    result.verification_level = 'invalid';
    result.valid = false;
  } else if (result.statuses.proof_status === 'cryptographically_verified' && hasAnchor) {
    result.verification_level = 'anchored_verified';
  } else if (result.statuses.proof_status === 'cryptographically_verified') {
    result.verification_level = 'cryptographically_verified';
  } else {
    result.verification_level = 'structurally_valid_unsigned';
  }

  if (result.errors.length > 0) result.valid = false;

  return result;
}

// ═══════════════════════════════════════════════════════════
// UI RENDERING
// ═══════════════════════════════════════════════════════════

const LEVEL_CONFIG = {
  anchored_verified: { icon: '🔗', label: 'Anchored & Verified', desc: 'Signature valid. Blockchain anchor present. Highest trust level.', cls: 'valid' },
  cryptographically_verified: { icon: '✓', label: 'Cryptographically Verified', desc: 'Provider signature is valid. Object integrity confirmed.', cls: 'valid' },
  structurally_valid_unsigned: { icon: '◇', label: 'Structurally Valid (Unsigned)', desc: 'Schema and hash are valid. No provider signature present.', cls: 'warning' },
  policy_failed: { icon: '⚠', label: 'Policy Failed', desc: 'Object may be valid but does not meet the requested policy.', cls: 'warning' },
  invalid: { icon: '✕', label: 'Invalid', desc: 'Verification failed. Do not trust this object.', cls: 'invalid' },
};

const GRADE_COLORS = {
  AAA: '#3ecf8e', AA: '#3ecf8e', A: '#60a5fa',
  B: '#f59e0b', C: '#f97316', LOW: '#ef4444',
};

function truncate(s, n = 16) {
  if (!s || s.length <= n * 2 + 3) return s;
  return s.slice(0, n) + '...' + s.slice(-n);
}

function renderResults(veo, result) {
  const $results = document.getElementById('results');
  $results.classList.remove('hidden');

  // Level banner
  const lvl = LEVEL_CONFIG[result.verification_level] || LEVEL_CONFIG.invalid;
  const $banner = document.getElementById('level-banner');
  $banner.className = 'level-banner ' + lvl.cls;
  document.getElementById('level-icon').textContent = lvl.icon;
  document.getElementById('level-label').textContent = lvl.label;
  document.getElementById('level-desc').textContent = lvl.desc;

  // Summary
  const summaryItems = [
    { label: 'Object ID', value: veo.object_id },
    { label: 'Class', value: veo.object_class },
    { label: 'Provider', value: veo.provider },
    { label: 'Issued', value: new Date(veo.issued_at).toLocaleString() },
    { label: 'Entropy', value: truncate(veo.entropy, 12), cls: 'truncated' },
    { label: 'Hash', value: truncate(veo.entropy_hash, 12), cls: 'truncated' },
  ];
  document.getElementById('summary-grid').innerHTML = summaryItems.map(item =>
    `<div class="grid-item"><div class="label">${item.label}</div><div class="value ${item.cls || ''}">${item.value || '—'}</div></div>`
  ).join('');

  // Checks
  document.getElementById('checks-list').innerHTML = Object.entries(result.checks).map(([name, val]) => {
    let cls, display;
    if (val === true) { cls = 'pass'; display = '✓ pass'; }
    else if (val === false) { cls = 'fail'; display = '✕ fail'; }
    else { cls = 'null'; display = '— n/a'; }
    return `<div class="check-row"><span class="check-name">${name}</span><span class="check-value ${cls}">${display}</span></div>`;
  }).join('');

  // Statuses
  const statusBadge = (val) => {
    const map = {
      cryptographically_verified: 'badge-pass', unsigned: 'badge-muted',
      invalid_signature: 'badge-fail', anchored: 'badge-pass',
      anchored_verified: 'badge-pass', unanchored: 'badge-muted',
      invalid_anchor: 'badge-fail', live: 'badge-pass',
      degraded: 'badge-warn', fallback_only: 'badge-warn',
      failed: 'badge-fail', satisfied: 'badge-pass',
      not_applicable: 'badge-muted',
    };
    return map[val] || 'badge-muted';
  };
  document.getElementById('statuses-list').innerHTML = Object.entries(result.statuses).map(([name, val]) =>
    `<div class="status-row"><span class="status-name">${name}</span><span class="status-value ${statusBadge(val)}">${val}</span></div>`
  ).join('');

  // ECS
  const ecs = veo.confidence;
  const gradeColor = GRADE_COLORS[ecs.grade] || '#888';
  document.getElementById('ecs-header').innerHTML =
    `<div class="ecs-score" style="color:${gradeColor}">${ecs.score}</div>` +
    `<div class="ecs-grade" style="background:${gradeColor}15;color:${gradeColor}">${ecs.grade}</div>`;

  const dimensions = ['freshness', 'diversity', 'independence', 'manipulation_resistance', 'verification_success', 'availability'];
  const barColor = (v) => v >= 800 ? 'var(--green)' : v >= 600 ? 'var(--yellow)' : 'var(--red)';
  document.getElementById('ecs-bars').innerHTML = dimensions.map(dim => {
    const val = ecs[dim] ?? 0;
    return `<div class="ecs-bar-row">
      <span class="ecs-bar-label">${dim.replace(/_/g, ' ')}</span>
      <div class="ecs-bar-track"><div class="ecs-bar-fill" style="width:${val/10}%;background:${barColor(val)}"></div></div>
      <span class="ecs-bar-value">${val}</span>
    </div>`;
  }).join('') + (ecs.fallback_count !== undefined ? `
    <div style="margin-top:8px;font-size:12px;color:var(--text-dim)">
      Live: ${ecs.live_source_count ?? '?'} · Fallback: ${ecs.fallback_count ?? '?'} · Status: <span class="${ecs.source_status === 'live' ? 'pass' : 'fail'}">${ecs.source_status ?? '?'}</span>
    </div>` : '');

  // Sources
  document.getElementById('sources-list').innerHTML = (veo.sources || []).map(src => {
    const isFallback = src.source_reference === 'fallback-crypto-random';
    return `<div class="source-row">
      <div>
        <div class="source-id">${src.source_id}</div>
        <div class="source-ref ${isFallback ? 'fail' : ''}">${src.source_reference || '—'}</div>
      </div>
      <div class="source-type">${src.source_type}</div>
    </div>`;
  }).join('');

  // Anchor
  const $anchorCard = document.getElementById('anchor-card');
  if (veo.anchor && veo.anchor.transaction_hash) {
    $anchorCard.classList.remove('hidden');
    const a = veo.anchor;
    const explorerBase = a.chain === 'polygon-mainnet' ? 'https://polygonscan.com' : 'https://amoy.polygonscan.com';
    document.getElementById('anchor-info').innerHTML = [
      { label: 'Chain', value: a.chain },
      { label: 'Contract', value: `<a href="${explorerBase}/address/${a.contract}" target="_blank">${truncate(a.contract, 10)}</a>` },
      { label: 'Transaction', value: `<a href="${explorerBase}/tx/${a.transaction_hash}" target="_blank">${truncate(a.transaction_hash, 10)}</a>` },
      { label: 'Block', value: a.block_number },
      { label: 'Merkle Root', value: truncate(a.merkle_root, 12) },
      { label: 'Batch ID', value: a.batch_id || '—' },
      { label: 'Timestamp', value: a.anchor_timestamp ? new Date(a.anchor_timestamp).toLocaleString() : '—' },
    ].map(r => `<div class="anchor-row"><span class="label">${r.label}</span><span class="value">${r.value}</span></div>`).join('');
  } else {
    $anchorCard.classList.add('hidden');
  }

  // Signature
  const proof = veo.proof || {};
  const sigRows = [
    { label: 'Type', value: proof.proof_type || 'none' },
    { label: 'Status', value: proof.proof_status || 'unsigned' },
  ];
  if (proof.signature_algorithm) sigRows.push({ label: 'Algorithm', value: proof.signature_algorithm });
  if (proof.provider_address) sigRows.push({ label: 'Provider', value: proof.provider_address });
  if (proof.provider_signature) sigRows.push({ label: 'Signature', value: truncate(proof.provider_signature, 16) });
  if (proof.canonical_hash) sigRows.push({ label: 'Canonical Hash', value: truncate(proof.canonical_hash, 12) });
  document.getElementById('sig-info').innerHTML = sigRows.map(r =>
    `<div class="anchor-row"><span class="label">${r.label}</span><span class="value">${r.value}</span></div>`
  ).join('');

  // Errors
  const $errCard = document.getElementById('errors-card');
  if (result.errors.length > 0) {
    $errCard.classList.remove('hidden');
    document.getElementById('errors-list').innerHTML = result.errors.map(e =>
      `<div class="error-item">${e}</div>`
    ).join('');
  } else {
    $errCard.classList.add('hidden');
  }

  // Raw
  document.getElementById('raw-result').textContent = JSON.stringify(result, null, 2);

  // Scroll to results
  $results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ═══════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════

// Real signed VEO-1 object for demonstration
const EXAMPLE_VEO = {"standard":"VEO-1","version":"1.0","object_id":"veo_ccf251f69c62b1b0457bc124b3c4cbeb","object_class":"VEO-1B","entropy":"0xbc7393649329d0b716bb2b08185485b6404e1f3fc6ea5a7435c98f90e8e79f66","entropy_hash":"0x2339cfba2ac751fc40b274e7696106a16d7a2a48757a3637e72102ff7a7ccb82","issued_at":"2026-06-24T12:17:16.753Z","expires_at":null,"provider":"OpenRNG","sources":[{"source_id":"drand-mainnet","source_type":"randomness_beacon","source_reference":"drand-round-29833357","timestamp":"2026-06-24T12:17:16.753Z","entropy_hash":"0x12322aff8b4acca255f13c1616eb2f9cee081ddfc81a7a7225adf8cb42f5dafb","signature":"0xa6d97e009a91cee427836f0ab80bbbee4aea06421575baf767e7ce7c18666479b938569274ebd4f349a76b865126cf88"},{"source_id":"bitcoin","source_type":"blockchain_block_hash","source_reference":"block-955166","timestamp":"2026-06-24T12:17:16.748Z","entropy_hash":"0x455cf4b46345f4819406c904b6893366c87a1f28a30f437d56d99c8fa8202ce3"},{"source_id":"polygon","source_type":"blockchain_block_hash","source_reference":"block-40714568","timestamp":"2026-06-24T12:17:17.000Z","entropy_hash":"0x338d463f59ff1d193240358a4b1f53eafd46825737eb49c6b5b70f61168c59b4"}],"aggregation":{"method":"sha256_concat","input_order":["drand-mainnet","bitcoin","polygon"],"aggregation_hash":"0x2339cfba2ac751fc40b274e7696106a16d7a2a48757a3637e72102ff7a7ccb82"},"confidence":{"score":871,"grade":"AA","freshness":1000,"diversity":1000,"independence":667,"manipulation_resistance":900,"verification_success":850,"availability":800,"fallback_count":0,"live_source_count":3,"source_status":"live"},"proof":{"proof_type":"provider_signature","proof_status":"cryptographically_signed","signature_algorithm":"secp256k1_eip191","provider_public_key":"0x03f62a4af6fd94f80c9a68e63d0d393d2457b04ed6be013d2de5a34c9b7f1153a5","provider_address":"0xD4F78bB8d4693b47FACe745B8819A159eE1bbBde","provider_signature":"0xe5f511414d62eae34318064a1276296a0221cf9de54230d64c994d5a89c2c4fb0d620eb4c9e9e731834fa084a3afaf24291b5caac2ff22101103a51b20b744751c","canonical_hash":"0x65e5c15b95d890c941f69abc980201aa65e1f390cfe3eebcb4b787275af850c3","verification_endpoint":"https://api.openrng.io/v2/entropy/verify"},"anchor":null,"lineage":null,"policy":null};

document.addEventListener('DOMContentLoaded', async () => {

  const $input = document.getElementById('veo-input');
  const $verify = document.getElementById('btn-verify');
  const $example = document.getElementById('btn-example');
  const $clear = document.getElementById('btn-clear');

  $example.addEventListener('click', () => {
    $input.value = JSON.stringify(EXAMPLE_VEO, null, 2);
  });

  $clear.addEventListener('click', () => {
    $input.value = '';
    document.getElementById('results').classList.add('hidden');
  });

  $verify.addEventListener('click', async () => {
    const raw = $input.value.trim();
    if (!raw) return;

    let veo;
    try {
      veo = JSON.parse(raw);
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
      return;
    }

    $verify.disabled = true;
    $verify.innerHTML = '<span class="spinner"></span> Verifying...';

    try {
      const result = await verifyVEO(veo);
      renderResults(veo, result);
    } catch (e) {
      alert('Verification error: ' + e.message);
    } finally {
      $verify.disabled = false;
      $verify.innerHTML = '<span class="btn-icon">⬡</span> Verify Object';
    }
  });

  // Allow Ctrl+Enter to verify
  $input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      $verify.click();
    }
  });
});
