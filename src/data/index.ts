import type { Fight } from "../domain/types";
import { validateFights } from "./validate";

const fightModules = import.meta.glob<Fight>(
  ["./fights/*.json", "!./fights/_TEMPLATE.json"],
  { eager: true, import: "default" },
);

const fights = Object.entries(fightModules)
  .filter(([path]) => !path.endsWith("/_TEMPLATE.json"))
  .map(([, fight]) => fight);

const validationIssues = validateFights(fights);

if (import.meta.env.DEV && validationIssues.length > 0) {
  console.error("Fight data validation failed:", validationIssues);
}

export function getAllFights(): Fight[] {
  return [...fights];
}

export function getFightById(id: string): Fight | undefined {
  return fights.find((fight) => fight.id === id);
}
