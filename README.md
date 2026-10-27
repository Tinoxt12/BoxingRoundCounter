# Scorecard

An offline boxing scorecard app for comparing your round-by-round scores with the official judges.

**Status: in development**

## Run locally

Requires Node.js 24 or newer and pnpm 11.

```sh
pnpm install
pnpm run dev
```

## Project checks

```sh
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

The app is being built in phases. Current progress includes the project scaffold, fictional fixture data with validation, and the core scoring and comparison logic.

## Comparison metric

The closest and furthest judge are determined by the sum of absolute differences between your and each judge's A-minus-B score margins across shared rounds. Lower distance means closer round margins. See [the metric notes](docs/scoring-and-comparison.md) for how draws, missing round data, and incomplete cards are handled.
