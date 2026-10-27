import { isCardComplete } from "./scorecard";
import type {
  Fight,
  JudgeCard,
  RoundScore,
  Side,
  UserCard,
  UserRoundScore,
} from "./types";

export type CardOutcome = Side | "draw";
export type MajorityOutcome = CardOutcome | "tie";

export type RoundComparison = {
  round: number;
  userScore: UserRoundScore;
  judgeScore: RoundScore;
  userWinner: CardOutcome;
  judgeWinner: CardOutcome;
  agrees: boolean;
  /** Signed difference between user and judge score margins (A minus B). */
  marginDifference: number;
};

export type JudgeDistance = {
  judge: string;
  distance: number;
};

export type JudgeComparison = {
  judge: string;
  userTotals: { totalA: number; totalB: number };
  officialTotals: { totalA: number; totalB: number };
  totalsDifference: { totalA: number; totalB: number };
  userFavours: CardOutcome;
  judgeFavours: CardOutcome;
  winnerAgreement: boolean | null;
  roundComparisons: RoundComparison[] | null;
  splitRounds: number[] | null;
  roundAgreementPct: number | null;
  /** Sum of absolute per-round margin differences, or null without shared round data. */
  distance: number | null;
};

export type MajorityRound = {
  round: number;
  judgeCount: number;
  majorityRoundWinner: MajorityOutcome;
  userScore: UserRoundScore | null;
  agreesWithMajority: boolean | null;
};

export type ContestedRound = {
  round: number;
  userScore: UserRoundScore | null;
  judgeScores: Array<{ judge: string; score: RoundScore; winner: CardOutcome }>;
  majorityRoundWinner: MajorityOutcome;
};

export type ComparisonResult = {
  fightId: string;
  complete: boolean;
  errors: string[];
  userTotals: { totalA: number; totalB: number };
  userWinner: CardOutcome | null;
  perJudge: JudgeComparison[];
  officialResultAgreement: boolean | null;
  majorityRounds: MajorityRound[];
  userVsMajorityRoundAgreementPct: number | null;
  mostContestedRounds: ContestedRound[];
  closestJudge: JudgeDistance | null;
  furthestJudge: JudgeDistance | null;
};

/** Convert a score pair into the boxer favoured or a draw. */
function outcomeForScore(a: number, b: number): CardOutcome {
  if (a > b) return "a";
  if (b > a) return "b";
  return "draw";
}

/** Return a one-decimal agreement percentage, or null for an empty sample. */
function percentage(agreed: number, compared: number): number | null {
  if (compared === 0) return null;
  return Math.round((agreed / compared) * 1000) / 10;
}

/** Return the scheduled or completed round count for this fight. */
function contestedRoundCount(fight: Fight): number {
  return fight.result.endedInRound ?? fight.scheduledRounds;
}

/** Index the user's scores that fall within the contested rounds. */
function getUserScoresByRound(
  card: UserCard,
  roundCount: number,
): Map<number, UserRoundScore> {
  return new Map(
    card.rounds
      .filter((score) => score.round >= 1 && score.round <= roundCount)
      .map((score) => [score.round, score]),
  );
}

/** Index one judge's optional round scores, preserving totals-only as null. */
function getJudgeScoresByRound(
  judge: JudgeCard,
): Map<number, RoundScore> | null {
  if (judge.rounds === undefined) return null;
  return new Map(judge.rounds.map((score) => [score.round, score]));
}

/** Sum final scores for the supplied user rounds. */
function sumRounds(rounds: UserRoundScore[]): {
  totalA: number;
  totalB: number;
} {
  return rounds.reduce(
    (totals, score) => ({
      totalA: totals.totalA + score.a,
      totalB: totals.totalB + score.b,
    }),
    { totalA: 0, totalB: 0 },
  );
}

/** Compare totals and shared round data against one official judge card. */
function compareJudge(
  judge: JudgeCard,
  userScores: Map<number, UserRoundScore>,
  userTotals: { totalA: number; totalB: number },
  userWinner: CardOutcome | null,
): JudgeComparison {
  const officialTotals = { totalA: judge.totalA, totalB: judge.totalB };
  const judgeFavours = outcomeForScore(judge.totalA, judge.totalB);
  const judgeRoundsByNumber = getJudgeScoresByRound(judge);

  let roundComparisons: RoundComparison[] | null = null;
  let splitRounds: number[] | null = null;
  let roundAgreementPct: number | null = null;
  let distance: number | null = null;

  if (judgeRoundsByNumber !== null) {
    const sharedRounds: RoundComparison[] = [];
    for (const [round, userScore] of userScores) {
      const judgeScore = judgeRoundsByNumber.get(round);
      if (judgeScore === undefined) continue;

      const userWinnerForRound = outcomeForScore(userScore.a, userScore.b);
      const judgeWinnerForRound = outcomeForScore(judgeScore.a, judgeScore.b);
      sharedRounds.push({
        round,
        userScore,
        judgeScore,
        userWinner: userWinnerForRound,
        judgeWinner: judgeWinnerForRound,
        agrees: userWinnerForRound === judgeWinnerForRound,
        marginDifference:
          userScore.a - userScore.b - (judgeScore.a - judgeScore.b),
      });
    }

    if (sharedRounds.length > 0) {
      sharedRounds.sort((left, right) => left.round - right.round);
      roundComparisons = sharedRounds;
      splitRounds = sharedRounds
        .filter((round) => !round.agrees)
        .map((round) => round.round);
      roundAgreementPct = percentage(
        sharedRounds.filter((round) => round.agrees).length,
        sharedRounds.length,
      );
      // Distance is the sum of absolute differences in A-minus-B round margins.
      distance = sharedRounds.reduce(
        (total, round) => total + Math.abs(round.marginDifference),
        0,
      );
    }
  }

  return {
    judge: judge.judge,
    userTotals,
    officialTotals,
    totalsDifference: {
      totalA: userTotals.totalA - judge.totalA,
      totalB: userTotals.totalB - judge.totalB,
    },
    userFavours: outcomeForScore(userTotals.totalA, userTotals.totalB),
    judgeFavours,
    winnerAgreement: userWinner === null ? null : userWinner === judgeFavours,
    roundComparisons,
    splitRounds,
    roundAgreementPct,
    distance,
  };
}

/** Return the most common round outcome, reporting vote ties explicitly. */
function majorityWinner(outcomes: CardOutcome[]): MajorityOutcome {
  const counts: Record<CardOutcome, number> = { a: 0, b: 0, draw: 0 };
  for (const outcome of outcomes) counts[outcome] += 1;
  const highestCount = Math.max(counts.a, counts.b, counts.draw);
  const possibleOutcomes: CardOutcome[] = ["a", "b", "draw"];
  const leaders = possibleOutcomes.filter(
    (outcome) => counts[outcome] === highestCount,
  );
  if (leaders.length !== 1) return "tie";
  return leaders[0] ?? "tie";
}

/**
 * Compare a user card with official judge cards. Incomplete cards return partial metrics
 * and an explanatory error; winner comparisons remain null until all contested rounds exist.
 */
export function compareCardToOfficial(
  userCard: UserCard,
  fight: Fight,
): ComparisonResult {
  const complete = isCardComplete(userCard, fight);
  const roundCount = contestedRoundCount(fight);
  const userScoresByRound = getUserScoresByRound(userCard, roundCount);
  const scoredRounds = [...userScoresByRound.values()].sort(
    (left, right) => left.round - right.round,
  );
  const userTotals = sumRounds(scoredRounds);
  const userWinner = complete
    ? outcomeForScore(userTotals.totalA, userTotals.totalB)
    : null;
  const errors: string[] = [];

  if (userCard.fightId !== fight.id) {
    errors.push(
      "The user card fightId does not match the fight being compared.",
    );
  }
  if (!complete) {
    errors.push(
      "The user card is incomplete; totals and round metrics use only scored contested rounds, and winner agreements are unavailable.",
    );
  }

  const perJudge = fight.judges.map((judge) =>
    compareJudge(judge, userScoresByRound, userTotals, userWinner),
  );

  const officialResultAgreement =
    complete && fight.result.winner !== "none"
      ? userWinner === fight.result.winner
      : null;
  if (complete && fight.result.winner === "none") {
    errors.push("The official result has no winner to compare.");
  }

  const majorityRounds: MajorityRound[] = [];
  const mostContestedRounds: ContestedRound[] = [];
  for (let round = 1; round <= roundCount; round += 1) {
    const judgeScores = fight.judges.flatMap((judge) => {
      const score = judge.rounds?.find(
        (roundScore) => roundScore.round === round,
      );
      return score === undefined ? [] : [{ judge: judge.judge, score }];
    });
    if (judgeScores.length < 2) continue;

    const judgeWinners = judgeScores.map(({ score }) =>
      outcomeForScore(score.a, score.b),
    );
    const majorityRoundWinner = majorityWinner(judgeWinners);
    const userScore = userScoresByRound.get(round) ?? null;
    const userRoundWinner =
      userScore === null ? null : outcomeForScore(userScore.a, userScore.b);

    majorityRounds.push({
      round,
      judgeCount: judgeScores.length,
      majorityRoundWinner,
      userScore,
      agreesWithMajority:
        userRoundWinner === null
          ? null
          : majorityRoundWinner !== "tie" &&
            userRoundWinner === majorityRoundWinner,
    });

    if (new Set(judgeWinners).size > 1) {
      mostContestedRounds.push({
        round,
        userScore,
        judgeScores: judgeScores.map(({ judge, score }) => ({
          judge,
          score,
          winner: outcomeForScore(score.a, score.b),
        })),
        majorityRoundWinner,
      });
    }
  }

  const majorityComparisons = majorityRounds.filter(
    (round) => round.agreesWithMajority !== null,
  );
  const userVsMajorityRoundAgreementPct = percentage(
    majorityComparisons.filter((round) => round.agreesWithMajority).length,
    majorityComparisons.length,
  );

  const judgesWithDistance = perJudge.filter(
    (judge): judge is JudgeComparison & { distance: number } =>
      judge.distance !== null,
  );
  const closestJudge = judgesWithDistance.reduce<JudgeDistance | null>(
    (closest, judge) =>
      closest === null || judge.distance < closest.distance
        ? { judge: judge.judge, distance: judge.distance }
        : closest,
    null,
  );
  const furthestJudge = judgesWithDistance.reduce<JudgeDistance | null>(
    (furthest, judge) =>
      furthest === null || judge.distance > furthest.distance
        ? { judge: judge.judge, distance: judge.distance }
        : furthest,
    null,
  );

  return {
    fightId: fight.id,
    complete,
    errors,
    userTotals,
    userWinner,
    perJudge,
    officialResultAgreement,
    majorityRounds,
    userVsMajorityRoundAgreementPct,
    mostContestedRounds,
    closestJudge,
    furthestJudge,
  };
}
