import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Modern functional HTTP interceptor for authentication
 * Adds JWT tokens to requests and handles authentication errors
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip authentication for login/register endpoints
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Check token expiration before making requests
  authService.checkTokenExpiration();

  // Clone and add authorization header if token exists
  const authHeader = authService.authorizationHeader;
  const authReq = authHeader 
    ? req.clone({
        setHeaders: {
          Authorization: authHeader
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 responses by triggering logout
      if (error.status === 401 && authService.isAuthenticated) {
        console.warn('Authentication failed, logging out user');
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};

/**
 * Check if the request URL is for authentication endpoints
 */
function isAuthEndpoint(url: string): boolean {
  const authPaths = ['/auth/login', '/auth/register', '/auth/checkUsername', '/auth/checkEmail'];
  return authPaths.some(path => url.includes(path));
}
