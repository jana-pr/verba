import { LearningDirection, LearningState } from './db/schema';

export interface MasteryUpdateResult {
  newState: LearningState;
  newStreak: number;
  nextReviewDate: string; // ISO string
  isDemoted: boolean;
}

/**
 * Spaced Repetition (SR) transition engine for VERBA.
 * Follows SM-2/Leitner hybrid rules:
 * - New: 0 attempts
 * - Learning: 1-2 correct or any mistake
 * - Review: streak >= 2, spaced intervals (1 day, 3 days, 7 days)
 * - Mastered: streak >= 4 consecutive correct answers without mistakes
 * Any mistake resets streak to 0, demotes immediately to 'learning', and schedules review for today.
 */
export function calculateMasteryUpdate(
  currentState: LearningState,
  currentStreak: number,
  isCorrect: boolean
): MasteryUpdateResult {
  const now = new Date();

  if (!isCorrect) {
    // Immediate demotion to learning, streak reset, scheduled immediately
    return {
      newState: 'learning',
      newStreak: 0,
      nextReviewDate: now.toISOString(),
      isDemoted: currentState === 'review' || currentState === 'mastered',
    };
  }

  const newStreak = currentStreak + 1;
  let newState: LearningState = 'learning';
  let daysUntilNextReview = 1;

  if (newStreak >= 4) {
    newState = 'mastered';
    daysUntilNextReview = 14;
  } else if (newStreak >= 2) {
    newState = 'review';
    daysUntilNextReview = newStreak === 2 ? 1 : 3;
  } else {
    newState = 'learning';
    daysUntilNextReview = 1;
  }

  const nextDate = new Date(now.getTime() + daysUntilNextReview * 24 * 60 * 60 * 1000);

  return {
    newState,
    newStreak,
    nextReviewDate: nextDate.toISOString(),
    isDemoted: false,
  };
}

/**
 * Calculates overall status from directional states.
 * Rule: Overall = min(cz_to_target, target_to_cz).
 * Hierarchy: new < learning < review < mastered
 */
export function calculateOverallState(
  czToTarget: LearningState,
  targetToCz: LearningState
): LearningState {
  const weight: Record<LearningState, number> = {
    new: 0,
    learning: 1,
    review: 2,
    mastered: 3,
  };

  const reverse: LearningState[] = ['new', 'learning', 'review', 'mastered'];
  const minWeight = Math.min(weight[czToTarget] ?? 0, weight[targetToCz] ?? 0);
  return reverse[minWeight];
}
