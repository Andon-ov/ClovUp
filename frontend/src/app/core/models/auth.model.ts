/**
 * Auth-related interfaces.
 */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'AUDITOR';
  tenant_id: number;
  tenant_name: string;
}

export interface TokenRefreshResponse {
  access: string;
}
