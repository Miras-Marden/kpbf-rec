import { FightMethod } from "@prisma/client";

export const RANKING_METHODOLOGY_VERSION = "v1.0.0";
export const BASE_RATING = 1500;
export const BASE_K_FACTOR = 24;
export const ACTIVE_INACTIVITY_GRACE_DAYS = 180;
export const ACTIVE_INACTIVITY_PENALTY_PER_DAY = 0.03;
export const ACTIVE_INACTIVITY_PENALTY_CAP = 200;

export const METHOD_MULTIPLIERS: Record<FightMethod, number> = {
  KO: 1.25,
  TKO: 1.2,
  UD: 1.0,
  MD: 0.95,
  SD: 0.9,
  DQ: 0.85,
  Draw: 0.75,
  NC: 0
};

export function getImportanceMultiplier(hasEvent: boolean) {
  return hasEvent ? 1.1 : 1.0;
}

export function expectedScore(playerRating: number, opponentRating: number) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function computeInactivityPenalty(daysSinceLastBout: number | null) {
  if (daysSinceLastBout === null || daysSinceLastBout <= ACTIVE_INACTIVITY_GRACE_DAYS) {
    return 0;
  }
  const overdueDays = daysSinceLastBout - ACTIVE_INACTIVITY_GRACE_DAYS;
  return Math.min(ACTIVE_INACTIVITY_PENALTY_CAP, overdueDays * ACTIVE_INACTIVITY_PENALTY_PER_DAY);
}

export function getMethodologyMetadata() {
  return {
    version: RANKING_METHODOLOGY_VERSION,
    formula: "R_new = R_old + K * importance * method * (actual - expected)",
    expectedScore: "expected = 1 / (1 + 10^((opponent - player)/400))",
    kFactor: BASE_K_FACTOR,
    baseRating: BASE_RATING,
    methodMultipliers: METHOD_MULTIPLIERS,
    boutImportance: {
      withEvent: getImportanceMultiplier(true),
      standaloneBout: getImportanceMultiplier(false)
    },
    inactivity: {
      appliesTo: "active_only",
      graceDays: ACTIVE_INACTIVITY_GRACE_DAYS,
      penaltyPerDay: ACTIVE_INACTIVITY_PENALTY_PER_DAY,
      maxPenalty: ACTIVE_INACTIVITY_PENALTY_CAP
    }
  };
}
