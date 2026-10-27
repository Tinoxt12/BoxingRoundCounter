import { describe, expect, it } from "vitest";
import { validateFights } from "./validate";

type FixtureInput = Record<string, unknown>;

function makeFight(overrides: FixtureInput = {}): FixtureInput {
  const rounds = [
    { round: 1, a: 10, b: 9 },
    { round: 2, a: 10, b: 9 },
    { round: 3, a: 10, b: 9 },
  ];

  return {
    id: "valid-test-fight",
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
      { judge: "Fixture Judge", totalA: 30, totalB: 27, rounds },
      { judge: "Fixture Judge Two", totalA: 30, totalB: 27, rounds },
      { judge: "Fixture Judge Three", totalA: 30, totalB: 27, rounds },
    ],
    sources: ["fixture"],
    verified: false,
    ...overrides,
  };
}

function getErrors(fight: unknown): string[] {
  return validateFights([fight])[0]?.errors ?? [];
}

describe("validateFights", () => {
  it("accepts a valid record", () => {
    expect(validateFights([makeFight()])).toEqual([]);
  });

  const invalidCases: Array<{
    label: string;
    fight: unknown;
    expectedError: string;
  }> = [
    {
      label: "rejects a non-kebab-case id",
      fight: makeFight({ id: "Not A Slug" }),
      expectedError: "kebab-case",
    },
    {
      label: "rejects a scheduled round count above 15",
      fight: makeFight({ scheduledRounds: 16 }),
      expectedError: "between 1 and 15",
    },
    {
      label: "rejects non-contiguous judge rounds",
      fight: makeFight({
        judges: [
          {
            judge: "Fixture Judge",
            totalA: 30,
            totalB: 27,
            rounds: [
              { round: 1, a: 10, b: 9 },
              { round: 3, a: 10, b: 9 },
              { round: 4, a: 10, b: 9 },
            ],
          },
        ],
      }),
      expectedError: "missing round 2",
    },
    {
      label: "rejects duplicate rounds",
      fight: makeFight({
        judges: [
          {
            judge: "Fixture Judge",
            totalA: 30,
            totalB: 27,
            rounds: [
              { round: 1, a: 10, b: 9 },
              { round: 1, a: 10, b: 9 },
              { round: 3, a: 10, b: 9 },
            ],
          },
        ],
      }),
      expectedError: "duplicate round 1",
    },
    {
      label: "rejects a round total mismatch",
      fight: makeFight({
        judges: [
          {
            judge: "Fixture Judge",
            totalA: 31,
            totalB: 27,
            rounds: [
              { round: 1, a: 10, b: 9 },
              { round: 2, a: 10, b: 9 },
              { round: 3, a: 10, b: 9 },
            ],
          },
        ],
      }),
      expectedError: "does not match the judge totals",
    },
    {
      label: "rejects a score outside the must system",
      fight: makeFight({
        judges: [
          {
            judge: "Fixture Judge",
            totalA: 31,
            totalB: 26,
            rounds: [
              { round: 1, a: 11, b: 8 },
              { round: 2, a: 10, b: 9 },
              { round: 3, a: 10, b: 9 },
            ],
          },
        ],
      }),
      expectedError: "whole numbers from 0 to 10",
    },
    {
      label: "rejects a lower score without a point deduction",
      fight: makeFight({
        judges: [
          {
            judge: "Fixture Judge",
            totalA: 29,
            totalB: 27,
            rounds: [
              { round: 1, a: 9, b: 9 },
              { round: 2, a: 10, b: 9 },
              { round: 3, a: 10, b: 9 },
            ],
          },
        ],
      }),
      expectedError: "lower final scores need a matching point deduction",
    },
    {
      label: "rejects a unanimous decision with a dissenting card",
      fight: makeFight({
        judges: [
          { judge: "Fixture Judge", totalA: 30, totalB: 27 },
          { judge: "Fixture Judge Two", totalA: 27, totalB: 30 },
          { judge: "Fixture Judge Three", totalA: 30, totalB: 27 },
        ],
      }),
      expectedError: "every judge favouring the recorded winner",
    },
    {
      label: "requires at least one source",
      fight: makeFight({ sources: [] }),
      expectedError: "non-empty array",
    },
    {
      label: "requires verified to be a boolean",
      fight: makeFight({ verified: "false" }),
      expectedError: "verified must be a boolean",
    },
    {
      label: "rejects an invalid ISO calendar date",
      fight: makeFight({ date: "2000-02-30" }),
      expectedError: "real ISO date",
    },
  ];

  it.each(invalidCases)("$label", ({ fight, expectedError }) => {
    expect(getErrors(fight).join("\n")).toContain(expectedError);
  });

  it("rejects duplicate ids across records", () => {
    const duplicate = validateFights([makeFight(), makeFight()]);
    expect(duplicate[0]?.errors).toContain(
      "id 'valid-test-fight' is duplicated.",
    );
  });

  it("accepts a deducted score when the event explains the lower final score", () => {
    const fight = makeFight({
      roundEvents: [{ round: 1, pointDeductions: { a: 1, b: 0 } }],
      judges: [
        {
          judge: "Fixture Judge",
          totalA: 29,
          totalB: 27,
          rounds: [
            { round: 1, a: 9, b: 9 },
            { round: 2, a: 10, b: 9 },
            { round: 3, a: 10, b: 9 },
          ],
        },
        {
          judge: "Fixture Judge Two",
          totalA: 29,
          totalB: 27,
          rounds: [
            { round: 1, a: 9, b: 9 },
            { round: 2, a: 10, b: 9 },
            { round: 3, a: 10, b: 9 },
          ],
        },
        {
          judge: "Fixture Judge Three",
          totalA: 29,
          totalB: 27,
          rounds: [
            { round: 1, a: 9, b: 9 },
            { round: 2, a: 10, b: 9 },
            { round: 3, a: 10, b: 9 },
          ],
        },
      ],
    });

    expect(validateFights([fight])).toEqual([]);
  });
});
