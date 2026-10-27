import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateFights } from "../src/data/validate.ts";

const fightsDirectory = fileURLToPath(
  new URL("../src/data/fights/", import.meta.url),
);
const files = (await readdir(fightsDirectory, { withFileTypes: true }))
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      entry.name !== "_TEMPLATE.json",
  )
  .sort((left, right) => left.name.localeCompare(right.name));

const fights = await Promise.all(
  files.map(async (entry) =>
    JSON.parse(
      await readFile(
        new URL(`../src/data/fights/${entry.name}`, import.meta.url),
        "utf8",
      ),
    ),
  ),
);
const issues = validateFights(fights);

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`${issue.fightId}:`);
    for (const error of issue.errors) {
      console.error(`  - ${error}`);
    }
  }
  process.exitCode = 1;
} else {
  console.log(`Validated ${fights.length} fight fixture(s).`);
}
