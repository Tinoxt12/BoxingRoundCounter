import { describe, expect, it } from "vitest";
import {
  createEmptyCard,
  getLegalScorePairs,
  isCardComplete,
  setRoundPointDeduction,
  setRoundScore,
  totalsForCard,
  updateCardStatus,
} from "./scorecard";
import { completeScores, createTestFight } from "../test/fightFactory";

const CREATED_AT = "2026-10-27T10:00:00.000Z";
const UPDATED_AT = "2026-10-27T10:05:00.000Z";

describe("user scorecard helpers", () => {
  it("creates a blank card with the expected defaults and supplied timestamp", () => {
    const fight = createTestFight();
    const card = createEmptyCard(fight, CREATED_AT);

    expect(card).toEqual({
      fightId: fight.id,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      rounds: [],
      status: "in_progress",
      mode: "blind",
    });
  });

  it("lists legal basic score pairs", () => {
    expect(getLegalScorePairs()).toEqual([
      { a: 10, b: 9 },
      { a: 9, b: 10 },
      { a: 10, b: 10 },
      { a: 10, b: 8 },
      { a: 8, b: 10 },
      { a: 10, b: 7 },
      { a: 7, b: 10 },
    ]);
  });

  it("adds scores in round order and replaces an existing round immutably", () => {
    const fight = createTestFight();
    const card = createEmptyCard(fight, CREATED_AT);
    const withRoundTwo = setRoundScore(card, 2, 9, 10, UPDATED_AT);
    const withBothRounds = setRoundScore(withRoundTwo, 1, 10, 9, UPDATED_AT);
    const edited = setRoundScore(withBothRounds, 2, 10, 8, UPDATED_AT);

    expect(card.rounds).toEqual([]);
    expect(edited.rounds).toEqual([
      { round: 1, a: 10, b: 9, pointDeductions: { a: 0, b: 0 } },
      { round: 2, a: 10, b: 8, pointDeductions: { a: 0, b: 0 } },
    ]);
    expect(edited.updatedAt).toBe(UPDATED_AT);
  });

  it("rejects invalid round numbers and non-must score pairs", () => {
    const card = createEmptyCard(createTestFight(), CREATED_AT);

    expect(() => setRoundScore(card, 0, 10, 9, UPDATED_AT)).toThrow(
      "Round number must be a positive whole number.",
    );
    expect(() => setRoundScore(card, 1, 10, 6, UPDATED_AT)).toThrow(
      "Round score must follow the 10-point must system",
    );
  });

  it("accepts even, 10-8, and 10-7 rounds in either direction", () => {
    const fight = createTestFight();
    const card = createEmptyCard(fight, CREATED_AT);
    const pairs = getLegalScorePairs();

    const scored = pairs.reduce(
      (current, pair, index) =>
        setRoundScore(current, index + 1, pair.a, pair.b, UPDATED_AT),
      card,
    );

    expect(scored.rounds).toHaveLength(pairs.length);
    expect(scored.rounds.map(({ a, b }) => ({ a, b }))).toEqual(pairs);
  });

  it("records a point deduction and permits the resulting 9-9 or 10-8 final score", () => {
    const fight = createTestFight();
    let card = createEmptyCard(fight, CREATED_AT);
    card = setRoundScore(card, 1, 10, 9, UPDATED_AT);
    card = setRoundPointDeduction(card, 1, "a", 1, UPDATED_AT);
    card = setRoundScore(card, 2, 10, 9, UPDATED_AT);
    card = setRoundPointDeduction(card, 2, "b", 1, UPDATED_AT);

    expect(card.rounds).toEqual([
      { round: 1, a: 9, b: 9, pointDeductions: { a: 1, b: 0 } },
      { round: 2, a: 10, b: 8, pointDeductions: { a: 0, b: 1 } },
    ]);
  });

  it("rejects a deduction without a score or one that makes an invalid final score", () => {
    const fight = createTestFight();
    let card = createEmptyCard(fight, CREATED_AT);

    expect(() => setRoundPointDeduction(card, 1, "a", 1, UPDATED_AT)).toThrow(
      "Score the round before recording a point deduction.",
    );

    card = setRoundScore(card, 1, 10, 7, UPDATED_AT);
    expect(() => setRoundPointDeduction(card, 1, "a", 11, UPDATED_AT)).toThrow(
      "Round score must follow the 10-point must system",
    );
  });

  it("marks an early-stoppage card complete after its contested rounds only", () => {
    const fight = createTestFight({
      scheduledRounds: 12,
      result: { method: "TKO", winner: "b", endedInRound: 6 },
    });
    const card = completeScores(6).reduce(
      (current, score) =>
        setRoundScore(current, score.round, score.a, score.b, UPDATED_AT),
      createEmptyCard(fight, CREATED_AT),
    );

    expect(isCardComplete(card, fight)).toBe(true);
    expect(updateCardStatus(card, fight).status).toBe("complete");
    expect(
      isCardComplete(setRoundScore(card, 7, 10, 9, UPDATED_AT), fight),
    ).toBe(false);
  });

  it("keeps a card in progress while a contested round is missing", () => {
    const fight = createTestFight();
    const card = completeScores(2).reduce(
      (current, score) =>
        setRoundScore(current, score.round, score.a, score.b, UPDATED_AT),
      createEmptyCard(fight, CREATED_AT),
    );

    expect(isCardComplete(card, fight)).toBe(false);
    expect(updateCardStatus(card, fight).status).toBe("in_progress");
  });

  it("sums final scores with deductions applied once", () => {
    const fight = createTestFight();
    let card = createEmptyCard(fight, CREATED_AT);
    card = setRoundScore(card, 1, 10, 9, UPDATED_AT);
    card = setRoundPointDeduction(card, 1, "a", 1, UPDATED_AT);
    card = setRoundScore(card, 2, 10, 8, UPDATED_AT);

    expect(totalsForCard(card)).toEqual({ totalA: 19, totalB: 17 });
  });
});
