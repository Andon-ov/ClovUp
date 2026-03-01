import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PaginatedResponse } from '../models/api.model';
import { Stock, StockMovement, Supplier, Delivery } from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly url = `${environment.apiUrl}/inventory`;

  constructor(private http: HttpClient) {}

  // ── Stock ──
  getStocks(params?: Record<string, string>): Observable<PaginatedResponse<Stock>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<Stock>>(`${this.url}/stocks/`, { params: httpParams });
  }

  getLowStock(): Observable<Stock[]> {
    return this.http.get<Stock[]>(`${this.url}/stocks/low-stock/`);
  }

  adjustStock(data: { location: number; product: number; quantity: number; movement_type: string; notes?: string }): Observable<Stock> {
    return this.http.post<Stock>(`${this.url}/stocks/adjust/`, data);
  }

  // ── Movements ──
  getMovements(params?: Record<string, string>): Observable<PaginatedResponse<StockMovement>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<StockMovement>>(`${this.url}/movements/`, { params: httpParams });
  }

  // ── Suppliers ──
  getSuppliers(): Observable<PaginatedResponse<Supplier>> {
    return this.http.get<PaginatedResponse<Supplier>>(`${this.url}/suppliers/`);
  }

  createSupplier(data: Partial<Supplier>): Observable<Supplier> {
    return this.http.post<Supplier>(`${this.url}/suppliers/`, data);
  }

  updateSupplier(id: number, data: Partial<Supplier>): Observable<Supplier> {
    return this.http.patch<Supplier>(`${this.url}/suppliers/${id}/`, data);
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/suppliers/${id}/`);
  }

  // ── Deliveries ──
  getDeliveries(): Observable<PaginatedResponse<Delivery>> {
    return this.http.get<PaginatedResponse<Delivery>>(`${this.url}/deliveries/`);
  }

  createDelivery(data: any): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.url}/deliveries/`, data);
  }

  receiveDelivery(id: number): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.url}/deliveries/${id}/receive/`, {});
  }
}
