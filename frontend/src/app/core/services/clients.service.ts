import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PaginatedResponse } from '../models/api.model';
import { ClientAccount, ClientGroup, SpendingLimit, Blacklist } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly url = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  // ── Groups ──
  getGroups(params?: Record<string, string>): Observable<PaginatedResponse<ClientGroup>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<ClientGroup>>(`${this.url}/groups/`, { params: httpParams });
  }

  createGroup(data: Partial<ClientGroup>): Observable<ClientGroup> {
    return this.http.post<ClientGroup>(`${this.url}/groups/`, data);
  }

  updateGroup(id: number, data: Partial<ClientGroup>): Observable<ClientGroup> {
    return this.http.patch<ClientGroup>(`${this.url}/groups/${id}/`, data);
  }

  deleteGroup(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/groups/${id}/`);
  }

  // ── Accounts ──
  getAccounts(params?: Record<string, string>): Observable<PaginatedResponse<ClientAccount>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<ClientAccount>>(`${this.url}/accounts/`, { params: httpParams });
  }

  getAccount(id: number): Observable<ClientAccount> {
    return this.http.get<ClientAccount>(`${this.url}/accounts/${id}/`);
  }

  createAccount(data: Partial<ClientAccount>): Observable<ClientAccount> {
    return this.http.post<ClientAccount>(`${this.url}/accounts/`, data);
  }

  updateAccount(id: number, data: Partial<ClientAccount>): Observable<ClientAccount> {
    return this.http.patch<ClientAccount>(`${this.url}/accounts/${id}/`, data);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/accounts/${id}/`);
  }

  topUp(id: number, amount: number, notes = ''): Observable<ClientAccount> {
    return this.http.post<ClientAccount>(`${this.url}/accounts/${id}/topup/`, { amount, notes });
  }

  blockAccount(id: number): Observable<ClientAccount> {
    return this.http.post<ClientAccount>(`${this.url}/accounts/${id}/block/`, {});
  }

  // ── Spending Limits ──
  getSpendingLimits(): Observable<PaginatedResponse<SpendingLimit>> {
    return this.http.get<PaginatedResponse<SpendingLimit>>(`${this.url}/spending-limits/`);
  }

  createSpendingLimit(data: Partial<SpendingLimit>): Observable<SpendingLimit> {
    return this.http.post<SpendingLimit>(`${this.url}/spending-limits/`, data);
  }

  deleteSpendingLimit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/spending-limits/${id}/`);
  }

  // ── Blacklist ──
  getBlacklist(): Observable<PaginatedResponse<Blacklist>> {
    return this.http.get<PaginatedResponse<Blacklist>>(`${this.url}/blacklist/`);
  }

  addToBlacklist(data: { card?: number; client_account?: number; reason: string }): Observable<Blacklist> {
    return this.http.post<Blacklist>(`${this.url}/blacklist/`, data);
  }

  removeFromBlacklist(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/blacklist/${id}/`);
  }
}
