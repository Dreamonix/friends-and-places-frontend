import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Functional route guard for protecting authenticated routes
 * Uses the modern CanActivateFn approach instead of class-based guards
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if token is expired and perform cleanup
  authService.checkTokenExpiration();
  
  if (authService.isAuthenticated) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  try {
    localStorage.setItem('fap_redirect_url', state.url);
  } catch (error) {
    console.error('Failed to store redirect URL:', error);
  }
  
  // Navigate to auth page
  router.navigate(['/auth'], { 
    queryParams: { returnUrl: state.url },
    replaceUrl: true 
  });
  
  return false;
};

/**
 * Guard to prevent authenticated users from accessing login/register pages
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return true;
  }

  // Redirect authenticated users to dashboard
  router.navigate(['/dashboard'], { replaceUrl: true });
  return false;
};
