import { describe, expect, it } from "vitest";
import { getAllFights, getFightById } from "./index";
import { validateFights } from "./validate";

describe("fight data loader", () => {
  it("loads and validates every shipped fixture", () => {
    const fights = getAllFights();

    expect(fights).toHaveLength(3);
    expect(validateFights(fights)).toEqual([]);
    expect(fights.every((fight) => fight.verified === false)).toBe(true);
    expect(fights.every((fight) => fight.sources.includes("fixture"))).toBe(
      true,
    );
  });

  it("looks up a fight by id and excludes the template", () => {
    expect(
      getFightById("test-fight-round-by-round-unanimous")?.judges[0]?.rounds,
    ).toHaveLength(3);
    expect(
      getAllFights().some((fight) => fight.id.startsWith("replace-with")),
    ).toBe(false);
  });

  it("covers totals-only cards and a round-six stoppage with a knockdown", () => {
    const fights = getAllFights();
    const totalsOnly = fights.find(
      (fight) => fight.id === "test-fight-totals-only-split-decision",
    );
    const stoppage = fights.find(
      (fight) => fight.id === "test-fight-early-stoppage-round-six",
    );

    expect(
      totalsOnly?.judges.every((judge) => judge.rounds === undefined),
    ).toBe(true);
    expect(stoppage?.result.endedInRound).toBe(6);
    expect(stoppage?.roundEvents?.[0]?.knockdowns?.b).toBe(1);
  });
});
