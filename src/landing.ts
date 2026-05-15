/**
 * OpenRNG Landing Page
 * Serves HTML to browsers, JSON to API clients (content negotiation)
 */

export function getLandingHTML(dbStatus: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenRNG — Provably Fair Randomness</title>
  <meta name="description" content="Verifiable random number generation for AI agents and gaming. Cryptographic proofs anchored on Polygon.">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --text: #e0e0e8;
      --muted: #6b6b80;
      --accent: #7c5cfc;
      --accent-dim: #5a3fd6;
      --green: #34d399;
      --mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      line-height: 1.6;
    }

    .container {
      max-width: 720px;
      width: 100%;
    }

    .hero {
      margin-bottom: 3rem;
    }

    .logo {
      font-family: var(--mono);
      font-size: 2.4rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }

    .logo span { color: var(--accent); }

    .tagline {
      color: var(--muted);
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }

    .patent {
      font-size: 0.8rem;
      color: var(--muted);
      font-style: italic;
      opacity: 0.7;
    }

    .status-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1.5rem 0;
      font-family: var(--mono);
      font-size: 0.85rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .status-text { color: var(--green); }
    .status-detail { color: var(--muted); }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .card h3 {
      font-family: var(--mono);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin-bottom: 1rem;
    }

    .endpoint {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      font-family: var(--mono);
      font-size: 0.9rem;
    }

    .endpoint:last-child { margin-bottom: 0; }

    .method {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
      min-width: 3rem;
      text-align: center;
    }

    .method-get { background: #1a3a2a; color: var(--green); }
    .method-post { background: #2a1a3a; color: #c084fc; }

    .endpoint-path { color: var(--text); }
    .endpoint-desc {
      color: var(--muted);
      font-size: 0.8rem;
      margin-left: auto;
    }

    pre {
      background: #08080d;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1.2rem;
      overflow-x: auto;
      font-family: var(--mono);
      font-size: 0.82rem;
      line-height: 1.7;
      color: var(--muted);
    }

    pre .cmd { color: var(--green); }
    pre .flag { color: #c084fc; }
    pre .str { color: #fbbf24; }
    pre .url { color: var(--accent); }

    .infra {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      font-size: 0.85rem;
    }

    .infra-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .infra-label {
      font-family: var(--mono);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .infra-value {
      color: var(--text);
      font-family: var(--mono);
      font-size: 0.85rem;
    }

    .links {
      display: flex;
      gap: 1.5rem;
      margin-top: 2rem;
      font-size: 0.85rem;
    }

    a {
      color: var(--accent);
      text-decoration: none;
      transition: color 0.15s;
    }

    a:hover { color: #9f85ff; }

    .footer {
      margin-top: 3rem;
      font-size: 0.75rem;
      color: var(--muted);
      opacity: 0.5;
      font-family: var(--mono);
    }

    @media (max-width: 480px) {
      .logo { font-size: 1.8rem; }
      .infra { grid-template-columns: 1fr; }
      .endpoint-desc { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="logo">Open<span>RNG</span></div>
      <div class="tagline">Provably fair randomness for AI agents &amp; gaming</div>
      <div class="patent">Patent: Method and System for Gaming Random Number Generation</div>
    </div>

    <div class="status-bar">
      <div class="status-dot"></div>
      <span class="status-text">Operational</span>
      <span class="status-detail">· Polygon Amoy · ${dbStatus}</span>
    </div>

    <div class="card">
      <h3>Endpoints</h3>
      <div class="endpoint">
        <span class="method method-get">GET</span>
        <span class="endpoint-path">/v1/health</span>
        <span class="endpoint-desc">System status</span>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <span class="endpoint-path">/v1/tokens/request</span>
        <span class="endpoint-desc">Get verified random tokens</span>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <span class="endpoint-path">/v1/tokens/batch</span>
        <span class="endpoint-desc">Bulk token request</span>
      </div>
      <div class="endpoint">
        <span class="method method-post">POST</span>
        <span class="endpoint-path">/v1/tokens/verify</span>
        <span class="endpoint-desc">Verify against chain</span>
      </div>
    </div>

    <div class="card">
      <h3>Quick Start</h3>
      <pre><span class="cmd">curl</span> <span class="flag">-X POST</span> <span class="url">https://api.openrng.io/v1/tokens/request</span> \\
  <span class="flag">-H</span> <span class="str">"Content-Type: application/json"</span> \\
  <span class="flag">-H</span> <span class="str">"x-api-key: YOUR_KEY"</span> \\
  <span class="flag">-d</span> <span class="str">'{"client_id":"my-agent","quantity":1}'</span></pre>
    </div>

    <div class="card">
      <h3>Infrastructure</h3>
      <div class="infra">
        <div class="infra-item">
          <span class="infra-label">Architecture</span>
          <span class="infra-value">Hybrid drand/VDF + Merkle</span>
        </div>
        <div class="infra-item">
          <span class="infra-label">Chain</span>
          <span class="infra-value">Polygon Amoy Testnet</span>
        </div>
        <div class="infra-item">
          <span class="infra-label">Batch Size</span>
          <span class="infra-value">65,536 tokens</span>
        </div>
        <div class="infra-item">
          <span class="infra-label">Verification</span>
          <span class="infra-value">On-chain Merkle proof</span>
        </div>
      </div>
    </div>

    <div class="links">
      <a href="https://github.com/openrng" target="_blank">GitHub</a>
      <a href="/v1/health">Health</a>
      <a href="https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8" target="_blank">Contract</a>
    </div>

    <div class="footer">v0.1.0 · api.openrng.io</div>
  </div>
</body>
</html>`;
}
