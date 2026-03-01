/**
 * Order domain models.
 */

export type OrderStatus = 'OPEN' | 'PAID' | 'VOIDED';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'RETAIL';
export type PaymentMethod = 'CASH' | 'CARD' | 'CHEQUE' | 'VOUCHER' | 'COUPON' | 'DIGITAL' | 'ACCOUNT' | 'MIXED';

export interface Order {
  id: number;
  uuid: string;
  receipt_sequence: number;
  order_number: string;
  tenant: number;
  location: number;
  device: number | null;
  shift: number | null;
  cashier: number | null;
  client_account: number | null;
  status: OrderStatus;
  order_type: OrderType;
  table_number: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes: string;
  voided_at: string | null;
  void_reason: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order: number;
  product: number | null;
  product_name: string;
  product_price: number;
  vat_group: string;
  cost_price: number | null;
  quantity: number;
  discount_pct: number;
  line_total: number;
  notes: string;
}

export interface Payment {
  id: number;
  order: number;
  client_account: number | null;
  paid_at: string;
  amount: number;
  payment_method: PaymentMethod;
  change_given: number;
  device: number | null;
}

export interface Shift {
  id: number;
  location: number;
  device: number;
  cashier: number;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  status: 'OPEN' | 'CLOSED';
  notes: string;
}

export interface DailyZReport {
  id: number;
  location__name: string;
  date: string;
  expected_total: number;
  fiscal_total: number;
  difference: number;
  status: 'BALANCED' | 'SHORT' | 'OVER';
  closed_by__user__username: string;
  created_at: string;
}

export interface CashOperation {
  id: number;
  shift: number;
  operation_type: 'SAFE_IN' | 'SAFE_OUT';
  amount: number;
  notes: string;
  created_at: string;
}

export interface AuditLogEntry {
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
