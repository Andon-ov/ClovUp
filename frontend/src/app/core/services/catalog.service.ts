import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PaginatedResponse } from '../models/api.model';
import { Product, ProductCategory, PriceList, PriceListItem } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly url = `${environment.apiUrl}/catalog`;

  constructor(private http: HttpClient) {}

  // ── Categories ──
  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(`${this.url}/categories/`);
  }

  createCategory(data: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.http.post<ProductCategory>(`${this.url}/categories/`, data);
  }

  updateCategory(id: number, data: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.http.patch<ProductCategory>(`${this.url}/categories/${id}/`, data);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/categories/${id}/`);
  }

  // ── Products ──
  getProducts(params?: Record<string, string>): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) httpParams = httpParams.set(key, val);
      });
    }
    return this.http.get<PaginatedResponse<Product>>(`${this.url}/products/`, { params: httpParams });
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.url}/products/${id}/`);
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.url}/products/`, data);
  }

  updateProduct(id: number, data: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.url}/products/${id}/`, data);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/products/${id}/`);
  }

  searchProducts(query: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.url}/products/search/`, {
      params: { search: query },
    });
  }

  // ── Price Lists ──
  getPriceLists(): Observable<PaginatedResponse<PriceList>> {
    return this.http.get<PaginatedResponse<PriceList>>(`${this.url}/pricelists/`);
  }

  createPriceList(data: Partial<PriceList>): Observable<PriceList> {
    return this.http.post<PriceList>(`${this.url}/pricelists/`, data);
  }

  updatePriceList(id: number, data: Partial<PriceList>): Observable<PriceList> {
    return this.http.patch<PriceList>(`${this.url}/pricelists/${id}/`, data);
  }

  deletePriceList(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/pricelists/${id}/`);
  }

  // ── Price List Items ──
  getPriceListItems(priceListId: number): Observable<PaginatedResponse<PriceListItem>> {
    return this.http.get<PaginatedResponse<PriceListItem>>(`${this.url}/pricelist-items/`, {
      params: { price_list: priceListId.toString() },
    });
  }

  createPriceListItem(data: Partial<PriceListItem>): Observable<PriceListItem> {
    return this.http.post<PriceListItem>(`${this.url}/pricelist-items/`, data);
  }

  deletePriceListItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/pricelist-items/${id}/`);
  }
}
