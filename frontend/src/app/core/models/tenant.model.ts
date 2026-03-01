/**
 * Tenant domain models.
 */

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  tax_number: string;
  plan: 'FREE' | 'BASIC' | 'PRO';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  tenant: number;
  name: string;
  address: string;
  city: string;
  object_name: string;
  created_at: string;
  updated_at: string;
}

export interface POSDevice {
  id: number;
  location: number;
  logical_name: string;
  display_name: string;
  notes: string;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'AUDITOR';

export interface TenantUser {
  id: number;
  user: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  tenant: number;
  role: UserRole;
  card_number: string;
  is_active: boolean;
  locations: number[];
  created_at: string;
  updated_at: string;
}
