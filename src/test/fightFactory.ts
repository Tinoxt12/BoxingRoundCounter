import {
  createEmptyCard,
  setRoundScore,
  updateCardStatus,
} from "../domain/scorecard";
import type { Fight, RoundScore, UserCard } from "../domain/types";

const TEST_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const judgeOneRounds: RoundScore[] = [
  { round: 1, a: 10, b: 9 },
  { round: 2, a: 10, b: 9 },
  { round: 3, a: 10, b: 9 },
];

const judgeTwoRounds: RoundScore[] = [
  { round: 1, a: 10, b: 9 },
  { round: 2, a: 9, b: 10 },
  { round: 3, a: 10, b: 9 },
];

const judgeThreeRounds: RoundScore[] = [
  { round: 1, a: 9, b: 10 },
  { round: 2, a: 10, b: 9 },
  { round: 3, a: 10, b: 9 },
];

export function createTestFight(overrides: Partial<Fight> = {}): Fight {
  return {
    id: "test-fight",
    title: "Test Fighter A vs Test Fighter B",
    date: "2000-01-01",
    weightClass: "Fixture division",
    boxers: {
      a: { name: "Test Fighter A" },
      b: { name: "Test Fighter B" },
    },
    scheduledRounds: 3,
    result: { method: "UD", winner: "a" },
    judges: [
      {
        judge: "Fixture Judge One",
        totalA: 30,
        totalB: 27,
        rounds: judgeOneRounds,
      },
      {
        judge: "Fixture Judge Two",
        totalA: 29,
        totalB: 28,
        rounds: judgeTwoRounds,
      },
      {
        judge: "Fixture Judge Three",
        totalA: 29,
        totalB: 28,
        rounds: judgeThreeRounds,
      },
    ],
    sources: ["fixture"],
    verified: false,
    ...overrides,
  };
}

export function createCardWithScores(
  fight: Fight,
  scores: RoundScore[],
): UserCard {
  let card = createEmptyCard(fight, TEST_TIMESTAMP);
  for (const score of scores) {
    card = setRoundScore(card, score.round, score.a, score.b, TEST_TIMESTAMP);
  }
  return updateCardStatus(card, fight);
}

export function completeScores(
  roundCount: number,
  a = 10,
  b = 9,
): RoundScore[] {
  return Array.from({ length: roundCount }, (_, index) => ({
    round: index + 1,
    a,
    b,
  }));
}
