# Scoring and comparison metrics

The scoring engine stores each user's final score for a round. A user round also records point deductions separately so the final score can be audited. Adding the deductions back must produce a legal 10-point must score: 10-10, 10-9, 10-8, or 10-7 in either direction. Totals use the final scores after deductions.

Card creation and score-update helpers take timestamp strings from their caller. This keeps domain logic deterministic and leaves clock access to the UI or storage layer. `updateCardStatus` derives `in_progress` or `complete` from the valid contested rounds.

## Totals and winners

The user's totals are the sum of scored contested rounds. A card is complete only when each contested round has one valid score. For an early stoppage, only rounds through `endedInRound` count. While a card is incomplete, totals and round metrics are partial, overall winner agreement is `null`, and the comparison includes an explanatory error. The comparison does not guess a final winner from partial totals.

For a complete card, a higher total favours that boxer and equal totals produce a draw. Per-judge winner agreement compares that outcome with the judge's totals and counts a draw as an outcome. Agreement with the official result is `null` when the official result has no winner, such as a no-contest.

## Round agreement

Round agreement compares the winner of each round, not the exact point margin. A 10-9 for boxer A agrees with a 10-8 for boxer A. A draw agrees only with another draw. `roundAgreementPct` is the percentage of shared, scored rounds with the same round winner, rounded to one decimal place. It is `null` for judges without round-by-round data or when there are no shared scored rounds. Totals-only judges still receive totals and winner comparisons.

The signed margin difference for a round is the user's A-minus-B score margin minus the judge's A-minus-B score margin. Positive means the user favoured boxer A by more points than the judge did; negative means the user favoured boxer B by more points.

## Majority and contested rounds

A majority round is calculated when at least two judges have round-by-round scores for that round. The majority outcome is the most common round winner, including draw. If multiple outcomes tie for the highest count, the result is explicitly `tie`. A tied majority counts as disagreement when calculating `userVsMajorityRoundAgreementPct`. This percentage uses only majority rounds for which the user has entered a score; it is `null` when there is no overlap.

`mostContestedRounds` lists rounds where judges with round-by-round data disagreed about the round winner. It includes each available judge score, the user's score when entered, and the majority outcome.

## Closest and furthest judge

For every judge with shared round-by-round data, distance is the sum of the absolute differences between the user's and judge's A-minus-B score margins, round by round. A lower distance means closer margins. Totals-only judges and judges with no shared scored rounds have no distance. If multiple judges tie for closest or furthest, the first judge in the fight record is returned.
