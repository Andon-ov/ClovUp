import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let message = 'Неочаквана грешка.';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          message = error.error.message;
        } else {
          // Server-side error
          switch (error.status) {
            case 0:
              message = 'Няма връзка със сървъра.';
              break;
            case 400:
              message = this._extractMessage(error) || 'Невалидна заявка.';
              break;
            case 403:
              message = 'Нямате достъп.';
              break;
            case 404:
              message = 'Ресурсът не е намерен.';
              break;
            case 500:
              message = 'Сървърна грешка. Опитайте отново.';
              break;
          }
        }

        console.error(`[HTTP ${error.status}]`, message, error);
        return throwError(() => ({ status: error.status, message, raw: error }));
      }),
    );
  }

  private _extractMessage(error: HttpErrorResponse): string | null {
    const body = error.error;
    if (!body) return null;
    if (typeof body === 'string') return body;
    if (body.detail) return body.detail;
    if (body.non_field_errors) return body.non_field_errors.join(' ');
    // Collect field errors
    const fieldErrors: string[] = [];
    for (const [key, val] of Object.entries(body)) {
      if (Array.isArray(val)) {
        fieldErrors.push(`${key}: ${val.join(', ')}`);
      }
    }
    return fieldErrors.length ? fieldErrors.join('; ') : null;
  }
}
