import type { ResultMethod, Side } from "../domain/types";

const RESULT_METHODS: readonly ResultMethod[] = [
  "UD",
  "MD",
  "SD",
  "KO",
  "TKO",
  "RTD",
  "DQ",
  "DRAW",
  "MAJORITY_DRAW",
  "SPLIT_DRAW",
  "NC",
];

type DataRecord = Record<string, unknown>;

export type ValidationIssue = {
  fightId: string;
  errors: string[];
};

function isRecord(value: unknown): value is DataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isSide(value: unknown): value is Side {
  return value === "a" || value === "b";
}

function isResultMethod(value: unknown): value is ResultMethod {
  return (
    typeof value === "string" &&
    RESULT_METHODS.some((method) => method === value)
  );
}

function addBoxerErrors(value: unknown, label: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }

  if (typeof value.name !== "string" || value.name.trim() === "") {
    errors.push(`${label}.name must be a non-empty string.`);
  }

  for (const optionalField of ["nickname", "country"] as const) {
    if (
      value[optionalField] !== undefined &&
      typeof value[optionalField] !== "string"
    ) {
      errors.push(`${label}.${optionalField} must be a string when provided.`);
    }
  }
}

function addScorePairErrors(
  value: DataRecord,
  roundNumber: number,
  deductions: { a: number; b: number },
  errors: string[],
): void {
  const scoreA = value.a;
  const scoreB = value.b;

  if (
    !isInteger(scoreA) ||
    !isInteger(scoreB) ||
    scoreA < 0 ||
    scoreB < 0 ||
    scoreA > 10 ||
    scoreB > 10
  ) {
    errors.push(
      `Round ${roundNumber} scores must be whole numbers from 0 to 10.`,
    );
    return;
  }

  // A recorded point deduction is added back before checking the must-system score.
  // This accepts final cards such as 9-9 after a one-point deduction from a 10-9 round.
  const baseA = scoreA + deductions.a;
  const baseB = scoreB + deductions.b;
  const standardMustScore =
    (baseA === 10 && baseB === 10) ||
    (baseA === 10 && baseB >= 7 && baseB <= 9) ||
    (baseB === 10 && baseA >= 7 && baseA <= 9);

  if (!standardMustScore) {
    errors.push(
      `Round ${roundNumber} must score 10-10 or 10-7 through 10-9; lower final scores need a matching point deduction event.`,
    );
  }
}

function getPointDeductions(
  fight: DataRecord,
  expectedRounds: number,
  errors: string[],
): Map<number, { a: number; b: number }> {
  const deductionsByRound = new Map<number, { a: number; b: number }>();
  const roundEvents = fight.roundEvents;

  if (roundEvents === undefined) {
    return deductionsByRound;
  }

  if (!Array.isArray(roundEvents)) {
    errors.push("roundEvents must be an array when provided.");
    return deductionsByRound;
  }

  const seenRounds = new Set<number>();

  roundEvents.forEach((event, index) => {
    if (!isRecord(event)) {
      errors.push(`roundEvents[${index}] must be an object.`);
      return;
    }

    const round = event.round;
    if (!isInteger(round) || round < 1 || round > expectedRounds) {
      errors.push(
        `roundEvents[${index}].round must be between 1 and ${expectedRounds}.`,
      );
      return;
    }

    if (seenRounds.has(round)) {
      errors.push(`roundEvents contains duplicate data for round ${round}.`);
      return;
    }
    seenRounds.add(round);

    const eventValues: {
      knockdowns: { a: number; b: number };
      pointDeductions: { a: number; b: number };
    } = {
      knockdowns: { a: 0, b: 0 },
      pointDeductions: { a: 0, b: 0 },
    };

    for (const eventType of ["knockdowns", "pointDeductions"] as const) {
      const eventValue = event[eventType];
      if (eventValue === undefined) {
        continue;
      }
      if (!isRecord(eventValue)) {
        errors.push(
          `roundEvents[${index}].${eventType} must contain a and b counts.`,
        );
        continue;
      }

      for (const side of ["a", "b"] as const) {
        const count = eventValue[side];
        if (!isNonNegativeInteger(count)) {
          errors.push(
            `roundEvents[${index}].${eventType}.${side} must be a non-negative whole number.`,
          );
        } else {
          eventValues[eventType][side] = count;
        }
      }
    }

    deductionsByRound.set(round, eventValues.pointDeductions);
  });

  return deductionsByRound;
}

function addJudgeRoundErrors(
  rounds: unknown,
  judgeIndex: number,
  expectedRounds: number,
  deductionsByRound: Map<number, { a: number; b: number }>,
  totals: { a: number; b: number },
  errors: string[],
): void {
  const label = `judges[${judgeIndex}].rounds`;
  if (!Array.isArray(rounds)) {
    errors.push(`${label} must be an array when provided.`);
    return;
  }

  const seenRounds = new Set<number>();
  let sumA = 0;
  let sumB = 0;
  let canCheckTotals = rounds.length === expectedRounds;

  rounds.forEach((roundScore, scoreIndex) => {
    if (!isRecord(roundScore)) {
      errors.push(`${label}[${scoreIndex}] must be an object.`);
      canCheckTotals = false;
      return;
    }

    const round = roundScore.round;
    if (!isInteger(round) || round < 1 || round > expectedRounds) {
      errors.push(
        `${label}[${scoreIndex}].round must be between 1 and ${expectedRounds}.`,
      );
      canCheckTotals = false;
      return;
    }

    if (seenRounds.has(round)) {
      errors.push(`${label} contains duplicate round ${round}.`);
      canCheckTotals = false;
    }
    seenRounds.add(round);

    if (isInteger(roundScore.a)) sumA += roundScore.a;
    if (isInteger(roundScore.b)) sumB += roundScore.b;

    const deductions = deductionsByRound.get(round) ?? { a: 0, b: 0 };
    addScorePairErrors(roundScore, round, deductions, errors);
    if (!isInteger(roundScore.a) || !isInteger(roundScore.b)) {
      canCheckTotals = false;
    }
  });

  for (let round = 1; round <= expectedRounds; round += 1) {
    if (!seenRounds.has(round)) {
      errors.push(
        `${label} is missing round ${round}; rounds must cover 1 through ${expectedRounds} contiguously.`,
      );
      canCheckTotals = false;
    }
  }

  if (canCheckTotals && (sumA !== totals.a || sumB !== totals.b)) {
    errors.push(
      `${label} sums to ${sumA}-${sumB}, which does not match the judge totals ${totals.a}-${totals.b}.`,
    );
  }
}

function addRoundStatsErrors(value: unknown, errors: string[]): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    errors.push("roundStats must be an array when provided.");
    return;
  }

  value.forEach((roundStats, index) => {
    if (
      !isRecord(roundStats) ||
      !isInteger(roundStats.round) ||
      roundStats.round < 1
    ) {
      errors.push(
        `roundStats[${index}] must contain a positive whole-number round.`,
      );
      return;
    }

    for (const side of ["a", "b"] as const) {
      const boxerStats = roundStats[side];
      if (!isRecord(boxerStats)) {
        errors.push(
          `roundStats[${index}].${side} must contain punch statistics.`,
        );
        continue;
      }

      for (const field of [
        "thrown",
        "landed",
        "jabThrown",
        "jabLanded",
        "powerThrown",
        "powerLanded",
        "headLanded",
        "bodyLanded",
      ] as const) {
        if (
          boxerStats[field] !== undefined &&
          !isNonNegativeInteger(boxerStats[field])
        ) {
          errors.push(
            `roundStats[${index}].${side}.${field} must be a non-negative whole number.`,
          );
        }
      }

      if (!isNonNegativeInteger(boxerStats.thrown)) {
        errors.push(
          `roundStats[${index}].${side}.thrown must be a non-negative whole number.`,
        );
      }
      if (!isNonNegativeInteger(boxerStats.landed)) {
        errors.push(
          `roundStats[${index}].${side}.landed must be a non-negative whole number.`,
        );
      }
      if (
        isNonNegativeInteger(boxerStats.thrown) &&
        isNonNegativeInteger(boxerStats.landed) &&
        boxerStats.landed > boxerStats.thrown
      ) {
        errors.push(
          `roundStats[${index}].${side}.landed cannot exceed thrown.`,
        );
      }
    }
  });
}

function addDecisionErrors(
  method: ResultMethod,
  winner: unknown,
  judgeOutcomes: Array<Side | "draw">,
  errors: string[],
): void {
  if (judgeOutcomes.length === 0) {
    return;
  }

  const favouredA = judgeOutcomes.filter((outcome) => outcome === "a").length;
  const favouredB = judgeOutcomes.filter((outcome) => outcome === "b").length;
  const draws = judgeOutcomes.filter((outcome) => outcome === "draw").length;
  const favouredWinner = isSide(winner)
    ? winner === "a"
      ? favouredA
      : favouredB
    : 0;
  const favouredOpponent = isSide(winner)
    ? winner === "a"
      ? favouredB
      : favouredA
    : 0;

  switch (method) {
    case "UD":
      if (!isSide(winner) || favouredWinner !== judgeOutcomes.length) {
        errors.push(
          "A unanimous decision must have every judge favouring the recorded winner by totals.",
        );
      }
      break;
    case "MD":
      if (
        !isSide(winner) ||
        favouredWinner < 2 ||
        draws < 1 ||
        favouredOpponent > 0
      ) {
        errors.push(
          "A majority decision must have at least two cards for the winner, at least one draw, and none for the opponent.",
        );
      }
      break;
    case "SD":
      if (
        !isSide(winner) ||
        favouredWinner < 2 ||
        favouredOpponent < 1 ||
        draws > 0
      ) {
        errors.push(
          "A split decision must have cards for both sides, with more cards for the recorded winner.",
        );
      }
      break;
    case "DRAW":
      if (winner !== "draw" || draws !== judgeOutcomes.length) {
        errors.push(
          "A draw result must have every judge scoring the fight level on totals.",
        );
      }
      break;
    case "MAJORITY_DRAW":
      if (winner !== "draw" || draws < 2 || draws === judgeOutcomes.length) {
        errors.push(
          "A majority draw must have at least two level cards and at least one card for a boxer.",
        );
      }
      break;
    case "SPLIT_DRAW":
      if (winner !== "draw" || favouredA < 1 || favouredB < 1 || draws < 1) {
        errors.push(
          "A split draw must have at least one card for each boxer and one level card.",
        );
      }
      break;
    default:
      break;
  }
}

function validateFight(value: unknown, seenIds: Set<string>): string[] {
  if (!isRecord(value)) {
    return ["Fight record must be an object."];
  }

  const errors: string[] = [];
  const id = value.id;
  if (typeof id !== "string" || id.trim() === "") {
    errors.push("id must be a non-empty string.");
  } else {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      errors.push("id must be a lowercase kebab-case slug.");
    }
    if (seenIds.has(id)) {
      errors.push(`id '${id}' is duplicated.`);
    }
    seenIds.add(id);
  }

  if (typeof value.title !== "string" || value.title.trim() === "") {
    errors.push("title must be a non-empty string.");
  }
  if (!isIsoDate(value.date)) {
    errors.push("date must be a real ISO date in YYYY-MM-DD format.");
  }
  if (
    typeof value.weightClass !== "string" ||
    value.weightClass.trim() === ""
  ) {
    errors.push("weightClass must be a non-empty string.");
  }
  if (value.venue !== undefined && typeof value.venue !== "string") {
    errors.push("venue must be a string when provided.");
  }
  if (value.location !== undefined && typeof value.location !== "string") {
    errors.push("location must be a string when provided.");
  }
  if (value.titlesOnTheLine !== undefined) {
    if (
      !Array.isArray(value.titlesOnTheLine) ||
      !value.titlesOnTheLine.every((title) => typeof title === "string")
    ) {
      errors.push("titlesOnTheLine must be an array of strings when provided.");
    }
  }

  const scheduledRounds = value.scheduledRounds;
  const validScheduledRounds =
    isInteger(scheduledRounds) && scheduledRounds >= 1 && scheduledRounds <= 15;
  if (!validScheduledRounds) {
    errors.push("scheduledRounds must be a whole number between 1 and 15.");
  }

  const result = value.result;
  let method: ResultMethod | undefined;
  let winner: unknown;
  let endedInRound: number | undefined;
  if (!isRecord(result)) {
    errors.push("result must be an object.");
  } else {
    if (!isResultMethod(result.method)) {
      errors.push("result.method must be a supported result method.");
    } else {
      method = result.method;
    }
    winner = result.winner;
    if (
      winner !== "a" &&
      winner !== "b" &&
      winner !== "draw" &&
      winner !== "none"
    ) {
      errors.push('result.winner must be "a", "b", "draw", or "none".');
    }
    if (result.endedInRound !== undefined) {
      if (
        !isInteger(result.endedInRound) ||
        result.endedInRound < 1 ||
        (validScheduledRounds && result.endedInRound > scheduledRounds)
      ) {
        errors.push(
          "result.endedInRound must be between 1 and scheduledRounds.",
        );
      } else {
        endedInRound = result.endedInRound;
      }
    }
    if (
      result.endedAtTime !== undefined &&
      typeof result.endedAtTime !== "string"
    ) {
      errors.push("result.endedAtTime must be a string when provided.");
    }
  }

  if (!isRecord(value.boxers)) {
    errors.push("boxers must contain boxer a and boxer b.");
  } else {
    addBoxerErrors(value.boxers.a, "boxers.a", errors);
    addBoxerErrors(value.boxers.b, "boxers.b", errors);
  }

  const expectedRounds =
    endedInRound ?? (validScheduledRounds ? scheduledRounds : 0);
  const deductionsByRound = getPointDeductions(value, expectedRounds, errors);
  const judges = value.judges;
  const judgeOutcomes: Array<Side | "draw"> = [];
  let allJudgeTotalsValid = true;

  if (!Array.isArray(judges) || judges.length === 0) {
    errors.push("judges must be a non-empty array.");
    allJudgeTotalsValid = false;
  } else {
    judges.forEach((judge, index) => {
      if (!isRecord(judge)) {
        errors.push(`judges[${index}] must be an object.`);
        allJudgeTotalsValid = false;
        return;
      }

      if (typeof judge.judge !== "string" || judge.judge.trim() === "") {
        errors.push(`judges[${index}].judge must be a non-empty string.`);
      }

      const totalA = judge.totalA;
      const totalB = judge.totalB;
      const totalsValid =
        isNonNegativeInteger(totalA) && isNonNegativeInteger(totalB);
      if (!totalsValid) {
        errors.push(
          `judges[${index}] totals must be non-negative whole numbers.`,
        );
        allJudgeTotalsValid = false;
      } else {
        if (totalA > totalB) judgeOutcomes.push("a");
        else if (totalB > totalA) judgeOutcomes.push("b");
        else judgeOutcomes.push("draw");
      }

      if (judge.rounds !== undefined) {
        addJudgeRoundErrors(
          judge.rounds,
          index,
          expectedRounds,
          deductionsByRound,
          {
            a: isNonNegativeInteger(judge.totalA) ? judge.totalA : 0,
            b: isNonNegativeInteger(judge.totalB) ? judge.totalB : 0,
          },
          errors,
        );
      }
    });
  }

  if (method !== undefined && allJudgeTotalsValid) {
    addDecisionErrors(method, winner, judgeOutcomes, errors);
  }

  if (
    !Array.isArray(value.sources) ||
    value.sources.length === 0 ||
    !value.sources.every(
      (source) => typeof source === "string" && source.trim() !== "",
    )
  ) {
    errors.push("sources must be a non-empty array of non-empty strings.");
  }
  if (typeof value.verified !== "boolean") {
    errors.push("verified must be a boolean.");
  }

  if (value.controversy !== undefined) {
    if (!isRecord(value.controversy)) {
      errors.push("controversy must be an object when provided.");
    } else {
      if (
        !isInteger(value.controversy.rating) ||
        value.controversy.rating < 1 ||
        value.controversy.rating > 5
      ) {
        errors.push("controversy.rating must be a whole number from 1 to 5.");
      }
      if (
        typeof value.controversy.summary !== "string" ||
        value.controversy.summary.trim() === ""
      ) {
        errors.push("controversy.summary must be a non-empty string.");
      }
    }
  }

  addRoundStatsErrors(value.roundStats, errors);
  return errors;
}

export function validateFights(fights: readonly unknown[]): ValidationIssue[] {
  const seenIds = new Set<string>();
  const issues: ValidationIssue[] = [];

  fights.forEach((fight, index) => {
    const candidateId =
      isRecord(fight) && typeof fight.id === "string"
        ? fight.id
        : `fight-${index + 1}`;
    const errors = validateFight(fight, seenIds);
    if (errors.length > 0) {
      issues.push({ fightId: candidateId, errors });
    }
  });

  return issues;
}
