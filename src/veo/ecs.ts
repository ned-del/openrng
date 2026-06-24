/**
 * VEO-1 — Entropy Confidence Score (ECS) Calculator
 *
 * Computes a 0–1000 score based on entropy source metadata.
 * Weights: freshness 20%, diversity 15%, independence 20%,
 *          manipulation_resistance 20%, verification_success 15%, availability 10%
 *
 * Audit fix #3: Penalizes ECS when sources use fallback-crypto-random.
 * Reports fallback_count, live_source_count, source_status.
 */

import { EntropyConfidence, EntropySourceRecord, VEOGrade } from './types.js';

export type SourceStatus = 'live' | 'degraded' | 'fallback_only' | 'failed';

export interface ECSInput {
  sources: EntropySourceRecord[];
  issuedAt: Date;
  now?: Date;
  verificationSuccess?: number; // 0–1000
  availability?: number;        // 0–1000
  manipulationResistance?: number; // 0–1000
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1000, Math.round(n)));
}

export function gradeForScore(score: number): VEOGrade {
  if (score >= 900) return 'AAA';
  if (score >= 800) return 'AA';
  if (score >= 700) return 'A';
  if (score >= 600) return 'B';
  if (score >= 500) return 'C';
  return 'LOW';
}

function computeSourceStatus(totalSources: number, fallbackCount: number): SourceStatus {
  if (totalSources === 0) return 'failed';
  if (fallbackCount === 0) return 'live';
  if (fallbackCount === totalSources) return 'fallback_only';
  return 'degraded';
}

export function calculateEntropyConfidence(input: ECSInput): EntropyConfidence {
  const now = input.now ?? new Date();
  const ageMs = Math.max(0, now.getTime() - input.issuedAt.getTime());
  const ageSeconds = ageMs / 1000;

  // Count fallback vs live sources
  const fallbackCount = input.sources.filter(
    s => s.source_reference === 'fallback-crypto-random'
  ).length;
  const totalSources = input.sources.length;
  const liveSourceCount = totalSources - fallbackCount;
  const sourceStatus = computeSourceStatus(totalSources, fallbackCount);

  // Freshness decays linearly over 10 minutes
  const freshness = clamp(1000 - (ageSeconds / 600) * 1000);

  // Diversity: count unique source IDs (only live sources contribute fully)
  const uniqueSources = new Set(input.sources.map(s => s.source_id)).size;
  const liveUniqueSources = new Set(
    input.sources.filter(s => s.source_reference !== 'fallback-crypto-random').map(s => s.source_id)
  ).size;
  let diversity = clamp(Math.min(liveUniqueSources / 3, 1) * 1000);

  // Independence: unique source_types from live sources
  const liveUniqueTypes = new Set(
    input.sources.filter(s => s.source_reference !== 'fallback-crypto-random').map(s => s.source_type)
  ).size;
  const independence = clamp(Math.min(liveUniqueTypes / 3, 1) * 1000);

  // Base values
  const baseManipulationResistance = input.manipulationResistance ?? (uniqueSources >= 3 ? 900 : uniqueSources === 2 ? 800 : 650);
  const baseVerificationSuccess = input.verificationSuccess ?? 850;
  const availability = clamp(input.availability ?? 800);

  // Apply fallback penalties per spec:
  // 1 fallback:  verification_success -100, manipulation_resistance -50
  // 2 fallback:  verification_success -250, manipulation_resistance -150, diversity -150
  // 3 (all):     ECS capped at 650, grade capped at B
  let manipulation_resistance: number;
  let verification_success: number;

  if (fallbackCount === 0) {
    manipulation_resistance = clamp(baseManipulationResistance);
    verification_success = clamp(baseVerificationSuccess);
  } else if (fallbackCount === 1) {
    verification_success = clamp(baseVerificationSuccess - 100);
    manipulation_resistance = clamp(baseManipulationResistance - 50);
  } else if (fallbackCount === 2) {
    verification_success = clamp(baseVerificationSuccess - 250);
    manipulation_resistance = clamp(baseManipulationResistance - 150);
    diversity = clamp(diversity - 150);
  } else {
    // All sources fallback — will be capped below
    verification_success = clamp(baseVerificationSuccess - 250);
    manipulation_resistance = clamp(baseManipulationResistance - 150);
    diversity = clamp(diversity - 150);
  }

  let score = clamp(
    freshness * 0.20 +
    diversity * 0.15 +
    independence * 0.20 +
    manipulation_resistance * 0.20 +
    verification_success * 0.15 +
    availability * 0.10
  );

  // All-fallback cap: ECS max 650, grade max B
  let grade: VEOGrade;
  if (fallbackCount >= totalSources && totalSources > 0) {
    score = Math.min(score, 650);
    grade = gradeForScore(score);
    // Grade cannot exceed B when all sources are fallback
    if (grade === 'AAA' || grade === 'AA' || grade === 'A') {
      grade = 'B';
    }
  } else {
    grade = gradeForScore(score);
  }

  return {
    score,
    grade,
    freshness,
    diversity,
    independence,
    manipulation_resistance,
    verification_success,
    availability,
    fallback_count: fallbackCount,
    live_source_count: liveSourceCount,
    source_status: sourceStatus,
  };
}
