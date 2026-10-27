import type {
  Fight,
  RoundScore,
  Side,
  UserCard,
  UserRoundScore,
} from "./types";

export type ScorePair = Pick<RoundScore, "a" | "b">;

const LEGAL_SCORE_PAIRS: readonly ScorePair[] = [
  { a: 10, b: 9 },
  { a: 9, b: 10 },
  { a: 10, b: 10 },
  { a: 10, b: 8 },
  { a: 8, b: 10 },
  { a: 10, b: 7 },
  { a: 7, b: 10 },
];

/** Check that a score-related number is integral. */
function isWholeNumber(value: number): boolean {
  return Number.isInteger(value);
}

/** Check a score after any recorded deductions have been added back. */
function isLegalBaseScore(a: number, b: number): boolean {
  return LEGAL_SCORE_PAIRS.some((score) => score.a === a && score.b === b);
}

/** Validate one final user score and its deduction record. */
function isValidUserRoundScore(score: UserRoundScore): boolean {
  if (
    !isWholeNumber(score.round) ||
    score.round < 1 ||
    !isWholeNumber(score.a) ||
    !isWholeNumber(score.b) ||
    score.a < 0 ||
    score.b < 0 ||
    score.a > 10 ||
    score.b > 10 ||
    !isWholeNumber(score.pointDeductions.a) ||
    !isWholeNumber(score.pointDeductions.b) ||
    score.pointDeductions.a < 0 ||
    score.pointDeductions.b < 0
  ) {
    return false;
  }

  return isLegalBaseScore(
    score.a + score.pointDeductions.a,
    score.b + score.pointDeductions.b,
  );
}

/** Throw when a final score cannot be explained by a must score and deductions. */
function assertValidScorePair(
  a: number,
  b: number,
  deductions: UserRoundScore["pointDeductions"],
): void {
  const candidate: UserRoundScore = {
    round: 1,
    a,
    b,
    pointDeductions: deductions,
  };

  if (!isValidUserRoundScore(candidate)) {
    throw new RangeError(
      "Round score must follow the 10-point must system; use a point deduction to explain a lower final score.",
    );
  }
}

/** Return the number of rounds that were actually contested. */
function contestedRoundCount(fight: Fight): number {
  return fight.result.endedInRound ?? fight.scheduledRounds;
}

/** Return the legal basic 10-point must score pairs, before deductions. */
export function getLegalScorePairs(): ScorePair[] {
  return LEGAL_SCORE_PAIRS.map((score) => ({ ...score }));
}

/** Create a new blank card. The caller supplies the timestamp to keep this helper pure. */
export function createEmptyCard(fight: Fight, createdAt: string): UserCard {
  return {
    fightId: fight.id,
    createdAt,
    updatedAt: createdAt,
    rounds: [],
    status: "in_progress",
    mode: "blind",
  };
}

/** Add or replace one scored round while preserving any deduction already recorded for it. */
export function setRoundScore(
  card: UserCard,
  round: number,
  a: number,
  b: number,
  updatedAt: string,
): UserCard {
  if (!isWholeNumber(round) || round < 1) {
    throw new RangeError("Round number must be a positive whole number.");
  }

  const existing = card.rounds.find((score) => score.round === round);
  const pointDeductions = existing?.pointDeductions ?? { a: 0, b: 0 };
  assertValidScorePair(a, b, pointDeductions);

  const nextRound: UserRoundScore = { round, a, b, pointDeductions };
  const nextRounds = card.rounds.filter((score) => score.round !== round);
  nextRounds.push(nextRound);
  nextRounds.sort((left, right) => left.round - right.round);

  return { ...card, rounds: nextRounds, updatedAt };
}

/** Apply a point deduction to a previously scored round and lower that side's final score. */
export function setRoundPointDeduction(
  card: UserCard,
  round: number,
  side: Side,
  points: number,
  updatedAt: string,
): UserCard {
  if (!isWholeNumber(points) || points < 1) {
    throw new RangeError("A point deduction must be a positive whole number.");
  }

  const existing = card.rounds.find((score) => score.round === round);
  if (existing === undefined) {
    throw new RangeError("Score the round before recording a point deduction.");
  }

  const pointDeductions = {
    ...existing.pointDeductions,
    [side]: existing.pointDeductions[side] + points,
  };
  const nextScore = {
    a: existing.a - (side === "a" ? points : 0),
    b: existing.b - (side === "b" ? points : 0),
  };
  assertValidScorePair(nextScore.a, nextScore.b, pointDeductions);

  const nextRound: UserRoundScore = {
    ...existing,
    ...nextScore,
    pointDeductions,
  };
  const nextRounds = card.rounds.map((score) =>
    score.round === round ? nextRound : score,
  );

  return { ...card, rounds: nextRounds, updatedAt };
}

/** Return whether every contested round has exactly one valid score. */
export function isCardComplete(card: UserCard, fight: Fight): boolean {
  if (card.fightId !== fight.id) {
    return false;
  }

  const totalRounds = contestedRoundCount(fight);
  if (!isWholeNumber(totalRounds) || totalRounds < 1) {
    return false;
  }

  const roundsByNumber = new Map<number, UserRoundScore>();
  for (const score of card.rounds) {
    if (
      score.round > totalRounds ||
      roundsByNumber.has(score.round) ||
      !isValidUserRoundScore(score)
    ) {
      return false;
    }
    roundsByNumber.set(score.round, score);
  }

  for (let round = 1; round <= totalRounds; round += 1) {
    if (!roundsByNumber.has(round)) {
      return false;
    }
  }

  return true;
}

/** Set the stored status from the card's current valid contested rounds. */
export function updateCardStatus(card: UserCard, fight: Fight): UserCard {
  return {
    ...card,
    status: isCardComplete(card, fight) ? "complete" : "in_progress",
  };
}

/** Sum final round scores; deductions are already reflected in each round's a/b values. */
export function totalsForCard(card: UserCard): {
  totalA: number;
  totalB: number;
} {
  return card.rounds.reduce(
    (totals, score) => ({
      totalA: totals.totalA + score.a,
      totalB: totals.totalB + score.b,
    }),
    { totalA: 0, totalB: 0 },
  );
}
