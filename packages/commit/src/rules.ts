/**
 * @fairseal/commit — Selection rules
 * 
 * Deterministic rule application: given an HMAC output (entropy)
 * and a set of inputs, produce the selection.
 * 
 * Rules are canonical JSON strings. The rule type determines
 * how entropy maps to a selection.
 */

export interface UniformRule {
  type: 'uniform';
  pick?: number;  // default: 1
}

export interface ShuffleRule {
  type: 'shuffle';
}

export interface IndexRule {
  type: 'index';
}

export type RuleSpec = UniformRule | ShuffleRule | IndexRule;

/**
 * Apply a selection rule to derive a deterministic result from entropy.
 * 
 * @param rule - Canonical JSON string of the rule
 * @param inputs - Candidate set
 * @param outputHex - HMAC output (hex string used as entropy source)
 * @returns The deterministic selection result
 */
export function applyRule(rule: string, inputs: string[], outputHex: string): unknown {
  const parsed = JSON.parse(rule) as RuleSpec;
  const entropy = BigInt('0x' + outputHex);

  switch (parsed.type) {
    case 'uniform': {
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

    case 'shuffle': {
      return fisherYatesShuffle([...inputs], entropy);
    }

    case 'index': {
      return Number(entropy % BigInt(inputs.length));
    }

    default:
      throw new Error(`Unknown rule type: ${(parsed as { type: string }).type}`);
  }
}

/**
 * Deterministic Fisher-Yates shuffle using BigInt entropy.
 * Consumes entropy by dividing — order-preserving and reproducible.
 */
function fisherYatesShuffle(arr: string[], entropy: bigint): string[] {
  let e = entropy;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Number(e % BigInt(i + 1));
    e = e / BigInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Validate a rule string. Returns true if the rule is parseable
 * and has a known type.
 */
export function validateRule(rule: string): { valid: boolean; error?: string } {
  try {
    const parsed = JSON.parse(rule) as { type?: string };
    if (!parsed.type) {
      return { valid: false, error: 'Rule must have a "type" field' };
    }
    if (!['uniform', 'shuffle', 'index'].includes(parsed.type)) {
      return { valid: false, error: `Unknown rule type: ${parsed.type}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Rule must be valid JSON' };
  }
}
