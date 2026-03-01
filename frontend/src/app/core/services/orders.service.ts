import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PaginatedResponse } from '../models/api.model';
import { Order, DailyZReport, Shift, AuditLogEntry } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly url = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  getOrders(params?: Record<string, string>): Observable<PaginatedResponse<Order>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<Order>>(`${this.url}/orders/`, { params: httpParams });
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.url}/orders/${id}/`);
  }

  voidOrder(id: number, reason: string): Observable<Order> {
    return this.http.post<Order>(`${this.url}/orders/${id}/void/`, { void_reason: reason });
  }

  // ── Shifts ──
  getShifts(params?: Record<string, string>): Observable<PaginatedResponse<Shift>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<Shift>>(`${this.url}/shifts/`, { params: httpParams });
  }

  // ── Audit Log ──
  getAuditLogs(params?: Record<string, string>): Observable<PaginatedResponse<AuditLogEntry>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<AuditLogEntry>>(`${this.url}/audit-logs/`, { params: httpParams });
  }
}
