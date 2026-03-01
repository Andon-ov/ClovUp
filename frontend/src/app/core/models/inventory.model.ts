/**
 * Inventory domain models.
 */

export interface Supplier {
  id: number;
  name: string;
  company_name: string;
  tax_number: string;
  vat_number: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: number;
  location: number;
  location_name: string;
  product: number;
  product_name: string;
  quantity: number;
  min_quantity: number;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'DELIVERY' | 'SALE' | 'VOID' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'WASTE' | 'RETURN';

export interface StockMovement {
  id: number;
  location: number;
  location_name: string;
  product: number;
  product_name: string;
  movement_type: MovementType;
  quantity: number;
  cost_price: number | null;
  notes: string;
  created_at: string;
}

export interface Delivery {
  id: number;
  supplier: number;
  supplier_name: string;
  location: number;
  location_name: string;
  invoice_number: string;
  status: 'PENDING' | 'RECEIVED';
  total_cost: number;
  notes: string;
  received_at: string | null;
  created_at: string;
}

export interface DeliveryItem {
  id: number;
  delivery: number;
  product: number;
  product_name: string;
  quantity: number;
  cost_price: number;
  line_total: number;
}
