export type Side = "a" | "b";

export type Boxer = {
  name: string;
  nickname?: string;
  country?: string;
};

export type ResultMethod =
  | "UD"
  | "MD"
  | "SD"
  | "KO"
  | "TKO"
  | "RTD"
  | "DQ"
  | "DRAW"
  | "MAJORITY_DRAW"
  | "SPLIT_DRAW"
  | "NC";

export type FightResult = {
  method: ResultMethod;
  winner: Side | "draw" | "none";
  endedInRound?: number;
  endedAtTime?: string;
};

export type RoundScore = {
  round: number;
  a: number;
  b: number;
};

export type JudgeCard = {
  judge: string;
  totalA: number;
  totalB: number;
  rounds?: RoundScore[];
};

export type RoundEvent = {
  round: number;
  knockdowns?: { a: number; b: number };
  pointDeductions?: { a: number; b: number };
};

export type PunchStats = {
  thrown: number;
  landed: number;
  jabThrown?: number;
  jabLanded?: number;
  powerThrown?: number;
  powerLanded?: number;
  headLanded?: number;
  bodyLanded?: number;
};

export type RoundStats = {
  round: number;
  a: PunchStats;
  b: PunchStats;
};

export type Fight = {
  id: string;
  title: string;
  date: string;
  venue?: string;
  location?: string;
  weightClass: string;
  titlesOnTheLine?: string[];
  boxers: { a: Boxer; b: Boxer };
  scheduledRounds: number;
  result: FightResult;
  judges: JudgeCard[];
  roundEvents?: RoundEvent[];
  controversy?: { rating: 1 | 2 | 3 | 4 | 5; summary: string };
  sources: string[];
  verified: boolean;
  roundStats?: RoundStats[];
};
