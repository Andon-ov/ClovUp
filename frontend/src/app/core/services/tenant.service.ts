import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { PaginatedResponse } from '../models/api.model';
import { Location, POSDevice, TenantUser } from '../models/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly url = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  // ── Locations ──
  getLocations(): Observable<PaginatedResponse<Location>> {
    return this.http.get<PaginatedResponse<Location>>(`${this.url}/locations/`);
  }

  createLocation(data: Partial<Location>): Observable<Location> {
    return this.http.post<Location>(`${this.url}/locations/`, data);
  }

  updateLocation(id: number, data: Partial<Location>): Observable<Location> {
    return this.http.patch<Location>(`${this.url}/locations/${id}/`, data);
  }

  deleteLocation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/locations/${id}/`);
  }

  // ── Devices ──
  getDevices(): Observable<PaginatedResponse<POSDevice>> {
    return this.http.get<PaginatedResponse<POSDevice>>(`${this.url}/devices/`);
  }

  createDevice(data: Partial<POSDevice>): Observable<POSDevice> {
    return this.http.post<POSDevice>(`${this.url}/devices/`, data);
  }

  updateDevice(id: number, data: Partial<POSDevice>): Observable<POSDevice> {
    return this.http.patch<POSDevice>(`${this.url}/devices/${id}/`, data);
  }

  deleteDevice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/devices/${id}/`);
  }

  // ── Users ──
  getUsers(): Observable<PaginatedResponse<TenantUser>> {
    return this.http.get<PaginatedResponse<TenantUser>>(`${this.url}/users/`);
  }

  createUser(data: any): Observable<TenantUser> {
    return this.http.post<TenantUser>(`${this.url}/users/`, data);
  }

  updateUser(id: number, data: Partial<TenantUser>): Observable<TenantUser> {
    return this.http.patch<TenantUser>(`${this.url}/users/${id}/`, data);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/users/${id}/`);
  }
}
