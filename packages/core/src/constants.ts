/** VEO-2 Standard Constants */

export const VEO_STANDARD = 'VEO' as const;
export const VEO_VERSION = '2.0' as const;

export const VEO_CLASSES = {
  /** Raw Execution Record — single AI call */
  RAW: 'VEO-2A',
  /** Composite Execution — multi-step chain or agent pipeline */
  COMPOSITE: 'VEO-2B',
  /** Anchored Execution — with blockchain proof */
  ANCHORED: 'VEO-2C',
  /** Governed Execution — with policy assertions and human approvals */
  GOVERNED: 'VEO-2D',
} as const;

export type VEOClassValue = typeof VEO_CLASSES[keyof typeof VEO_CLASSES];
