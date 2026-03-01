import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth endpoints
    if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
      return next.handle(req);
    }

    const token = this.auth.getAccessToken();
    let authReq = req;
    if (token) {
      authReq = this._addToken(req, token);
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return this._handle401(authReq, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private _addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  private _handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isRefreshing) {
      // Wait for the token to be refreshed
      return this.refreshSubject.pipe(
        filter((token: string | null): token is string => token !== null),
        take(1),
        switchMap((token: string) => next.handle(this._addToken(req, token))),
      );
    }

    this.isRefreshing = true;
    this.refreshSubject.next(null);

    return this.auth.refreshToken().pipe(
      switchMap((res: import('../models/auth.model').TokenRefreshResponse | null) => {
        this.isRefreshing = false;
        if (res) {
          this.refreshSubject.next(res.access);
          return next.handle(this._addToken(req, res.access));
        }
        return throwError(() => new Error('Token refresh failed'));
      }),
      catchError((err: any) => {
        this.isRefreshing = false;
        this.auth.logout();
        return throwError(() => err);
      }),
    );
  }
}
