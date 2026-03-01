import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { Order, Shift } from '../models/order.model';

export interface CreateOrderRequest {
  uuid: string;
  receipt_sequence: number;
  order_type: string;
  table_number?: string;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  product_id: number;
  quantity: number;
  discount_pct?: number;
  notes?: string;
}

export interface AddPaymentRequest {
  payment_method: string;
  amount: number;
  change_given?: number;
  client_account_id?: number;
}

export interface CashOperationRequest {
  amount: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly api = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // ── Shifts ──
  getActiveShift(): Observable<Shift[]> {
    return this.http.get<Shift[]>(`${this.api}/orders/shifts/`, { params: { status: 'OPEN' } });
  }

  openShift(data: { opening_cash: number }): Observable<Shift> {
    return this.http.post<Shift>(`${this.api}/orders/shifts/`, {
      ...data,
      opened_at: new Date().toISOString(),
      status: 'OPEN',
    });
  }

  closeShift(id: number, closing_cash: number): Observable<Shift> {
    return this.http.post<Shift>(`${this.api}/orders/shifts/${id}/close/`, {
      closing_cash,
    });
  }

  // ── Orders ──
  createOrder(data: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.api}/orders/orders/`, data);
  }

  addPayment(orderId: number, data: AddPaymentRequest): Observable<any> {
    return this.http.post<any>(`${this.api}/orders/orders/${orderId}/payments/`, data);
  }

  // ── Fiscal ──
  safeIn(data: CashOperationRequest): Observable<any> {
    return this.http.post(`${this.api}/fiscal/safe-in/`, data);
  }

  safeOut(data: CashOperationRequest): Observable<any> {
    return this.http.post(`${this.api}/fiscal/safe-out/`, data);
  }

  xReport(): Observable<any> {
    return this.http.post(`${this.api}/fiscal/x-report/`, {});
  }

  zReport(): Observable<any> {
    return this.http.post(`${this.api}/fiscal/z-report/`, {});
  }
}
