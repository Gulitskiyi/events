import type { ConditionOp, ContestCategory, ProposalStatus } from "./contest";

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  published: number;
  created_at: string;
  contracts_enabled: number;
  contracts_voting: number;
  proposals_deadline: string | null;
};

export type EventWithCount = EventRecord & {
  registration_count: number;
  proposal_count: number;
};

export type RegistrationRecord = {
  id: string;
  event_id: string;
  full_name: string;
  company: string;
  country: string;
  phone: string;
  phone_norm: string;
  position: string;
  email: string;
  remind: number;
  created_at: string;
  reminder_status: string;
  reminder_sent_at: string | null;
  reminder_error: string | null;
  lang: string;
};

export type RegistrationWithEvent = RegistrationRecord & {
  event_title: string;
  event_slug: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  summary: string;
};

export type EventInput = {
  title: string;
  summary: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  slug: string;
  published: boolean;
  contracts_enabled: boolean;
  contracts_voting: boolean;
  proposals_deadline: string | null;
};

export type ContractProposal = {
  id: string;
  event_id: string;
  registration_id: string | null;
  number: number;
  title: string;
  category: ContestCategory | "";
  asset_code: string;
  asset_label: string;
  event_question: string;
  condition_op: ConditionOp | "";
  condition_value: string;
  settlement_at: string;
  comment: string;
  status: ProposalStatus;
  text: string;
  last_name: string;
  first_name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  created_at: string;
  votes: number;
  voted: boolean;
};

export type DirectoryCategory = ContestCategory;

export type DirectoryItem = {
  id: string;
  category: DirectoryCategory;
  code: string;
  title: string;
  search: string;
  active: number;
  sort_order: number;
  created_at: string;
};

export type ContestSettings = {
  green_list_url: string;
  its_stocks_url: string;
};
