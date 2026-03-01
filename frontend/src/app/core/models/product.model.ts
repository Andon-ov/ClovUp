/**
 * Product & catalog domain models.
 */

export interface ProductCategory {
  id: number;
  name: string;
  parent: number | null;
  color: string;
  legacy_id: string | null;
  children: ProductCategory[];
}

export interface Product {
  id: number;
  category: number | null;
  category_name: string | null;
  name: string;
  barcode: string | null;
  sku: string | null;
  unit: 'PCS' | 'KG' | 'L' | 'M';
  vat_group: 'А' | 'Б' | 'В' | 'Г';
  price: number;
  cost_price: number | null;
  max_discount_pct: number;
  is_active: boolean;
  is_deleted: boolean;
  image: string | null;
  legacy_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSearch {
  id: number;
  name: string;
  barcode: string | null;
  price: number;
  vat_group: string;
  unit: string;
  image: string | null;
}

export interface PriceList {
  id: number;
  name: string;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
}

export interface PriceListItem {
  id: number;
  price_list: number;
  product: number;
  product_name: string;
  price: number;
}

export interface ProductLimit {
  id: number;
  product: number;
  device: number;
  max_discount: number;
}
