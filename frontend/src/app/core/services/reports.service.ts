import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { DailyZReport } from '../models/order.model';

export interface DashboardKPIs {
  total_revenue: number;
  order_count: number;
  avg_ticket: number;
  top_category: string | null;
  top_category_revenue: number;
}

export interface SalesByDate {
  date: string;
  revenue: number;
  count: number;
  avg_ticket: number;
}

export interface SalesByHour {
  hour: string;
  revenue: number;
  count: number;
}

export interface TopProduct {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

export interface VatBreakdown {
  vat_group: string;
  total_amount: number;
  total_items: number;
}

export interface PaymentBreakdown {
  payment_method: string;
  total: number;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly url = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getDashboardKPIs(params?: Record<string, string>): Observable<DashboardKPIs> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<DashboardKPIs>(`${this.url}/dashboard/`, { params: httpParams });
  }

  getSalesByDate(params?: Record<string, string>): Observable<SalesByDate[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<SalesByDate[]>(`${this.url}/sales/`, { params: httpParams });
  }

  getSalesByHour(params?: Record<string, string>): Observable<SalesByHour[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<SalesByHour[]>(`${this.url}/hourly/`, { params: httpParams });
  }

  getTopProducts(params?: Record<string, string>): Observable<TopProduct[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<TopProduct[]>(`${this.url}/top-products/`, { params: httpParams });
  }

  getVatBreakdown(params?: Record<string, string>): Observable<VatBreakdown[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<VatBreakdown[]>(`${this.url}/vat/`, { params: httpParams });
  }

  getPaymentBreakdown(params?: Record<string, string>): Observable<PaymentBreakdown[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaymentBreakdown[]>(`${this.url}/payments/`, { params: httpParams });
  }

  getZReportHistory(params?: Record<string, string>): Observable<DailyZReport[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<DailyZReport[]>(`${this.url}/z-reports/`, { params: httpParams });
  }

  exportCsv(params?: Record<string, string>): void {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    this.http.get(`${this.url}/export/csv/`, {
      params: httpParams,
      responseType: 'blob',
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  exportExcel(params?: Record<string, string>): void {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    this.http.get(`${this.url}/export/excel/`, {
      params: httpParams,
      responseType: 'blob',
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
