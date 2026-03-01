import { Injectable, signal, computed } from  '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { LoginRequest, LoginResponse, UserInfo, TokenRefreshResponse } from '../models/auth.model';

const ACCESS_KEY = 'clovup_access';
const REFRESH_KEY = 'clovup_refresh';
const USER_KEY = 'clovup_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // Signals for reactive state
  private _user = signal<UserInfo | null>(this._loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly userRole = computed(() => this._user()?.role ?? null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login/`, credentials).pipe(
      tap((res: LoginResponse) => {
        this._storeTokens(res.access, res.refresh);
        this._storeUser(res.user);
        this._user.set(res.user);
      }),
      catchError((error) => {
        console.error('Login failed:', error);
        throw error;
      }),
    );
  }

  logout(): void {
    const refresh = this.getRefreshToken();
    if (refresh) {
      this.http.post(`${this.apiUrl}/auth/logout/`, { refresh }).subscribe({
        error: () => {},  // Ignore — we're logging out anyway
      });
    }
    this._clearStorage();
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<TokenRefreshResponse | null> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      this.logout();
      return of(null);
    }

    return this.http.post<TokenRefreshResponse>(`${this.apiUrl}/auth/refresh/`, { refresh }).pipe(
      tap((res: TokenRefreshResponse | null) => {
        if (res) {
          localStorage.setItem(ACCESS_KEY, res.access);
        }
      }),
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  hasRole(...roles: string[]): boolean {
    const role = this._user()?.role;
    return role ? roles.includes(role) : false;
  }

  // ─── Private ───

  private _storeTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  private _storeUser(user: UserInfo): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private _loadUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private _clearStorage(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
