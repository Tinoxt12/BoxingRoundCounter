import { describe, expect, it } from "vitest";
import { compareCardToOfficial } from "./comparison";
import type { JudgeCard, RoundScore } from "./types";
import {
  completeScores,
  createCardWithScores,
  createTestFight,
} from "../test/fightFactory";

describe("compareCardToOfficial", () => {
  it("compares totals, round winners, majority rounds, contested rounds, and judge distance", () => {
    const fight = createTestFight();
    const card = createCardWithScores(fight, completeScores(3));
    const comparison = compareCardToOfficial(card, fight);

    expect(comparison.complete).toBe(true);
    expect(comparison.userTotals).toEqual({ totalA: 30, totalB: 27 });
    expect(comparison.userWinner).toBe("a");
    expect(comparison.officialResultAgreement).toBe(true);
    expect(comparison.perJudge.map((judge) => judge.winnerAgreement)).toEqual([
      true,
      true,
      true,
    ]);
    expect(
      comparison.perJudge[1]?.roundComparisons?.[1]?.marginDifference,
    ).toBe(2);
    expect(comparison.perJudge[2]?.splitRounds).toEqual([1]);
    expect(comparison.perJudge[0]?.distance).toBe(0);
    expect(comparison.closestJudge).toEqual({
      judge: "Fixture Judge One",
      distance: 0,
    });
    expect(comparison.furthestJudge).toEqual({
      judge: "Fixture Judge Two",
      distance: 2,
    });
    expect(
      comparison.majorityRounds.map((round) => round.majorityRoundWinner),
    ).toEqual(["a", "a", "a"]);
    expect(comparison.userVsMajorityRoundAgreementPct).toBe(100);
    expect(comparison.mostContestedRounds.map((round) => round.round)).toEqual([
      1, 2,
    ]);
    expect(comparison.mostContestedRounds[0]?.userScore?.round).toBe(1);
  });

  it("counts a draw as an outcome for judge and official-result agreement", () => {
    const round: RoundScore = { round: 1, a: 10, b: 10 };
    const drawJudge = (judge: string): JudgeCard => ({
      judge,
      totalA: 10,
      totalB: 10,
      rounds: [round],
    });
    const fight = createTestFight({
      scheduledRounds: 1,
      result: { method: "DRAW", winner: "draw" },
      judges: [
        drawJudge("Judge One"),
        drawJudge("Judge Two"),
        drawJudge("Judge Three"),
      ],
    });
    const card = createCardWithScores(fight, [round]);
    const comparison = compareCardToOfficial(card, fight);

    expect(comparison.userWinner).toBe("draw");
    expect(comparison.officialResultAgreement).toBe(true);
    expect(comparison.perJudge.every((judge) => judge.winnerAgreement)).toBe(
      true,
    );
    expect(comparison.majorityRounds[0]?.majorityRoundWinner).toBe("draw");
    expect(comparison.userVsMajorityRoundAgreementPct).toBe(100);
  });

  it("reports an explicit tie when two judges with round data split their votes", () => {
    const judgeA: JudgeCard = {
      judge: "Judge A",
      totalA: 10,
      totalB: 9,
      rounds: [{ round: 1, a: 10, b: 9 }],
    };
    const judgeB: JudgeCard = {
      judge: "Judge B",
      totalA: 9,
      totalB: 10,
      rounds: [{ round: 1, a: 9, b: 10 }],
    };
    const judgeTotalsOnly: JudgeCard = {
      judge: "Judge C",
      totalA: 10,
      totalB: 9,
    };
    const fight = createTestFight({
      scheduledRounds: 1,
      judges: [judgeA, judgeB, judgeTotalsOnly],
    });
    const comparison = compareCardToOfficial(
      createCardWithScores(fight, [{ round: 1, a: 10, b: 9 }]),
      fight,
    );

    expect(comparison.majorityRounds[0]?.majorityRoundWinner).toBe("tie");
    expect(comparison.majorityRounds[0]?.agreesWithMajority).toBe(false);
    expect(comparison.userVsMajorityRoundAgreementPct).toBe(0);
    expect(comparison.mostContestedRounds).toHaveLength(1);
    expect(comparison.mostContestedRounds[0]?.judgeScores).toHaveLength(2);
  });

  it("returns null round metrics for totals-only judges and preserves their totals comparisons", () => {
    const fight = createTestFight({
      judges: [
        { judge: "Judge One", totalA: 30, totalB: 27 },
        { judge: "Judge Two", totalA: 29, totalB: 28 },
        { judge: "Judge Three", totalA: 29, totalB: 28 },
      ],
    });
    const comparison = compareCardToOfficial(
      createCardWithScores(fight, completeScores(3)),
      fight,
    );

    expect(comparison.perJudge[0]?.judgeFavours).toBe("a");
    expect(comparison.perJudge[0]?.totalsDifference).toEqual({
      totalA: 0,
      totalB: 0,
    });
    expect(comparison.perJudge[0]?.roundComparisons).toBeNull();
    expect(comparison.perJudge[0]?.roundAgreementPct).toBeNull();
    expect(comparison.perJudge[0]?.splitRounds).toBeNull();
    expect(comparison.perJudge[0]?.distance).toBeNull();
    expect(comparison.majorityRounds).toEqual([]);
    expect(comparison.userVsMajorityRoundAgreementPct).toBeNull();
    expect(comparison.closestJudge).toBeNull();
    expect(comparison.furthestJudge).toBeNull();
  });

  it("handles mixed round-by-round and totals-only judge cards", () => {
    const baseFight = createTestFight();
    const judgeOne = baseFight.judges[0];
    const judgeTwo = baseFight.judges[1];
    if (judgeOne === undefined || judgeTwo === undefined) {
      throw new Error("The test fight must include two judges.");
    }
    const fight = createTestFight({
      judges: [judgeOne, { ...judgeTwo, rounds: undefined }],
    });
    const comparison = compareCardToOfficial(
      createCardWithScores(fight, completeScores(3)),
      fight,
    );

    expect(comparison.perJudge[0]?.roundAgreementPct).toBe(100);
    expect(comparison.perJudge[1]?.roundAgreementPct).toBeNull();
    expect(comparison.majorityRounds).toEqual([]);
  });

  it("uses only contested rounds for an early stoppage", () => {
    const rounds = completeScores(6);
    const earlyJudgeOne: JudgeCard = {
      judge: "Fixture Judge",
      totalA: 60,
      totalB: 54,
      rounds,
    };
    const earlyJudgeTwo: JudgeCard = {
      judge: "Fixture Judge Two",
      totalA: 60,
      totalB: 54,
      rounds,
    };
    const fight = createTestFight({
      scheduledRounds: 12,
      result: { method: "TKO", winner: "a", endedInRound: 6 },
      judges: [earlyJudgeOne, earlyJudgeTwo],
    });
    const card = createCardWithScores(fight, rounds);
    const comparison = compareCardToOfficial(card, fight);

    expect(comparison.complete).toBe(true);
    expect(comparison.userTotals).toEqual({ totalA: 60, totalB: 54 });
    expect(comparison.perJudge[0]?.roundComparisons).toHaveLength(6);
    expect(comparison.majorityRounds).toHaveLength(6);
  });

  it("returns partial metrics and a clear error for an incomplete user card", () => {
    const fight = createTestFight();
    const card = createCardWithScores(fight, [{ round: 1, a: 10, b: 9 }]);
    const comparison = compareCardToOfficial(card, fight);

    expect(comparison.complete).toBe(false);
    expect(comparison.errors[0]).toContain("incomplete");
    expect(comparison.userTotals).toEqual({ totalA: 10, totalB: 9 });
    expect(comparison.userWinner).toBeNull();
    expect(comparison.officialResultAgreement).toBeNull();
    expect(
      comparison.perJudge.every((judge) => judge.winnerAgreement === null),
    ).toBe(true);
    expect(comparison.perJudge[0]?.roundAgreementPct).toBe(100);
  });

  it("reports disagreement when the user scores a round opposite all judges", () => {
    const fight = createTestFight();
    const card = createCardWithScores(fight, completeScores(3, 9, 10));
    const comparison = compareCardToOfficial(card, fight);

    expect(comparison.userWinner).toBe("b");
    expect(comparison.officialResultAgreement).toBe(false);
    expect(
      comparison.perJudge.every((judge) => judge.winnerAgreement === false),
    ).toBe(true);
    expect(comparison.perJudge[0]?.splitRounds).toContain(3);
  });

  it("keeps the completed-round majority percentage null when no rounds overlap", () => {
    const fight = createTestFight({
      scheduledRounds: 1,
      judges: [
        {
          judge: "Totals One",
          totalA: 10,
          totalB: 9,
          rounds: [{ round: 1, a: 10, b: 9 }],
        },
        {
          judge: "Totals Two",
          totalA: 10,
          totalB: 9,
          rounds: [{ round: 1, a: 10, b: 9 }],
        },
      ],
    });
    const comparison = compareCardToOfficial(
      createCardWithScores(fight, []),
      fight,
    );

    expect(comparison.majorityRounds).toHaveLength(1);
    expect(comparison.userVsMajorityRoundAgreementPct).toBeNull();
    expect(comparison.perJudge[0]?.roundAgreementPct).toBeNull();
  });

  it("does not treat a card for another fight as complete", () => {
    const fight = createTestFight();
    const otherFight = createTestFight({ id: "another-fight" });
    const comparison = compareCardToOfficial(
      createCardWithScores(otherFight, completeScores(3)),
      fight,
    );

    expect(comparison.complete).toBe(false);
    expect(comparison.errors).toContain(
      "The user card fightId does not match the fight being compared.",
    );
    expect(comparison.officialResultAgreement).toBeNull();
  });
});
