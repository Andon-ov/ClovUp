/**
 * Client domain models.
 */

export interface ClientGroup {
  id: number;
  name: string;
  description: string;
  valid_until: string | null;
  credit_allowed: boolean;
  overdraft_limit: number;
  discount_on_open: number;
  preferred_price_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: number;
  physical_number: string;
  logical_number: string;
  created_by: number | null;
  created_at: string;
}

export interface ClientAccount {
  id: number;
  name: string;
  notes: string;
  is_blocked: boolean;
  card: number | null;
  card_number: string | null;
  client_group: number | null;
  group_name: string | null;
  company_name: string;
  balance_1: number;
  balance_2: number;
  accumulated_1: number;
  accumulated_2: number;
  base_amount: number;
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpendingLimit {
  id: number;
  name: string;
  amount: number;
  device: number | null;
  limit_type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Blacklist {
  id: number;
  card: number | null;
  card_number: string;
  client_account: number | null;
  account_name: string;
  reason: string;
  blocked_at: string;
  blocked_by: number | null;
}

export interface AuditLog {
  id: number;
  user: number | null;
  username: string;
  action: string;
  model_name: string;
  object_id: string;
  changes: any;
  ip_address: string;
  device: number | null;
  created_at: string;
}
