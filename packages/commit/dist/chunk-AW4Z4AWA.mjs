// src/rules.ts
function applyRule(rule, inputs, outputHex) {
  const parsed = JSON.parse(rule);
  const entropy = BigInt("0x" + outputHex);
  switch (parsed.type) {
    case "uniform": {
      const pick = parsed.pick ?? 1;
      if (pick > inputs.length) {
        throw new Error(`Cannot pick ${pick} from ${inputs.length} inputs`);
      }
      if (pick < 1) {
        throw new Error(`pick must be >= 1, got ${pick}`);
      }
      const shuffled = fisherYatesShuffle([...inputs], entropy);
      return pick === 1 ? shuffled[0] : shuffled.slice(0, pick);
    }
    case "shuffle": {
      return fisherYatesShuffle([...inputs], entropy);
    }
    case "index": {
      return Number(entropy % BigInt(inputs.length));
    }
    default:
      throw new Error(`Unknown rule type: ${parsed.type}`);
  }
}
function fisherYatesShuffle(arr, entropy) {
  let e = entropy;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Number(e % BigInt(i + 1));
    e = e / BigInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function validateRule(rule) {
  try {
    const parsed = JSON.parse(rule);
    if (!parsed.type) {
      return { valid: false, error: 'Rule must have a "type" field' };
    }
    if (!["uniform", "shuffle", "index"].includes(parsed.type)) {
      return { valid: false, error: `Unknown rule type: ${parsed.type}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Rule must be valid JSON" };
  }
}

export {
  applyRule,
  validateRule
};
