export const SETTLEMENT_DATE = "2027-11-26";
export const SETTLEMENT_LABEL_RU = "26 ноября 2027 года";

export const PROPOSAL_STATUSES = ["received", "reviewing", "approved", "rejected"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const CONTEST_CATEGORIES = ["central_banks", "its_stocks", "crypto_green"] as const;
export type ContestCategory = (typeof CONTEST_CATEGORIES)[number];

export const CONDITION_OPS = ["above", "below", "equal", "at_or_above", "at_or_below"] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export const DEFAULT_REF_LINKS = {
  greenList: "/afsa-green-list.pdf",
  itsStocks: "https://itsx.kz",
} as const;

export function isProposalStatus(value: string): value is ProposalStatus {
  return (PROPOSAL_STATUSES as readonly string[]).includes(value);
}

export function isContestCategory(value: string): value is ContestCategory {
  return (CONTEST_CATEGORIES as readonly string[]).includes(value);
}

export function isConditionOp(value: string): value is ConditionOp {
  return (CONDITION_OPS as readonly string[]).includes(value);
}

export function buildProposalSummary(input: {
  title: string;
  assetLabel: string;
  eventQuestion: string;
  conditionOp: ConditionOp;
  conditionValue: string;
  settlementAt: string;
}) {
  const op =
    input.conditionOp === "above"
      ? ">"
      : input.conditionOp === "below"
        ? "<"
        : input.conditionOp === "equal"
          ? "="
          : input.conditionOp === "at_or_above"
            ? "≥"
            : "≤";
  return `${input.title}: ${input.assetLabel} ${op} ${input.conditionValue}. ${input.eventQuestion} (до ${input.settlementAt})`;
}
