import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, EMPTY } from 'rxjs';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { 
  User, 
  UserRegisterDTO, 
  UserLoginDTO, 
  LoginResponse, 
  AuthState 
} from './auth.types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly API_BASE_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'fap_auth_token';
  private readonly USER_KEY = 'fap_current_user';

  // Auth state management with proper typing
  private readonly authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });

  public readonly authState$ = this.authStateSubject.asObservable();

  constructor() {
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    const token = this.getStoredToken();
    const user = this.getStoredUser();

    if (token && user && !this.isTokenExpired(token)) {
      this.updateAuthState({
        isAuthenticated: true,
        user,
        token
      });
    } else {
      // Clear invalid/expired data
      this.clearStoredAuth();
    }
  }

  /**
   * Register a new user
   */
  register(userData: UserRegisterDTO): Observable<User> {
    return this.http.post<User>(`${this.API_BASE_URL}/register`, userData)
      .pipe(
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Login user with enhanced error handling
   * Note: Since there's no dedicated /me endpoint, we'll rely on JWT + API data when needed
   */
  login(credentials: UserLoginDTO): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_BASE_URL}/login`, credentials)
      .pipe(
        tap(response => {
          if (response?.token) {
            this.setToken(response.token);
            
            // Decode user info from token
            const decodedUser = this.decodeUserFromToken(response.token);
            if (decodedUser) {
              this.setUser(decodedUser);
            }
            
            this.updateAuthState({
              isAuthenticated: true,
              user: decodedUser,
              token: response.token
            });

            // Redirect to stored URL or dashboard
            this.redirectAfterLogin();
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Logout user with cleanup
   */
  logout(): void {
    this.clearStoredAuth();
    this.updateAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    this.router.navigate(['/auth']);
  }

  /**
   * Check if username is available
   */
  checkUsername(username: string): Observable<boolean> {
    if (!username?.trim()) {
      return throwError(() => new Error('Username is required'));
    }

    return this.http.get<boolean>(`${this.API_BASE_URL}/checkUsername`, {
      params: { username: username.trim() }
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Check if email is available
   */
  checkEmail(email: string): Observable<boolean> {
    if (!email?.trim()) {
      return throwError(() => new Error('Email is required'));
    }

    return this.http.get<boolean>(`${this.API_BASE_URL}/checkEmail`, {
      params: { email: email.trim() }
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Getters for reactive access
  get currentAuthState(): AuthState {
    return this.authStateSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.currentAuthState.isAuthenticated;
  }

  get currentUser(): User | null {
    return this.currentAuthState.user;
  }

  get currentToken(): string | null {
    return this.currentAuthState.token;
  }

  get authorizationHeader(): string | null {
    const token = this.currentToken;
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Update authentication state (private method)
   */
  private updateAuthState(newState: AuthState): void {
    this.authStateSubject.next(newState);
  }

  /**
   * Store token securely
   */
  private setToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  /**
   * Store user data securely
   */
  private setUser(user: User): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  /**
   * Get stored token
   */
  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Get stored user
   */
  private getStoredUser(): User | null {
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Failed to parse stored user data:', error);
      return null;
    }
  }

  /**
   * Clear all stored authentication data
   */
  private clearStoredAuth(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem('fap_redirect_url');
    } catch (error) {
      console.error('Failed to clear stored auth data:', error);
    }
  }

  /**
   * Handle HTTP errors with user-friendly messages
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'An unexpected error occurred. Please try again.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side/network error
      userMessage = 'Network error. Please check your connection.';
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          userMessage = error.error?.message || 'Invalid request. Please check your input.';
          break;
        case 401:
          userMessage = 'Invalid email or password.';
          this.logout(); // Auto-logout on unauthorized
          break;
        case 403:
          userMessage = 'Access denied.';
          break;
        case 409:
          userMessage = error.error?.message || 'User already exists.';
          break;
        case 500:
          userMessage = 'Server error. Please try again later.';
          break;
        default:
          if (error.error?.message) {
            userMessage = error.error.message;
          }
      }
    }

    console.error('Auth Service Error:', error);
    return throwError(() => new Error(userMessage));
  }

  /**
   * Decode user information from JWT token
   */
  private decodeUserFromToken(token: string): User | null {
    try {
      const payload = this.decodeTokenPayload(token);
      console.log('JWT Payload:', payload); // Debug log
      
      if (payload) {
        // Extract username - prefer actual username fields over email
        const username = this.extractUsername(payload);
        
        // Extract email - prefer email fields
        const email = this.extractEmail(payload);
        
        // Only create user if we have at least email
        if (email) {
          // Create a better fallback username from email
          const emailPrefix = email.split('@')[0];
          // Try to create a more user-friendly username
          let displayUsername = emailPrefix;
          
          // If the email prefix contains dots or underscores, try to format it nicely
          if (displayUsername.includes('.') || displayUsername.includes('_')) {
            displayUsername = displayUsername
              .split(/[._]/)
              .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
          } else {
            // Just capitalize first letter for simple usernames
            displayUsername = displayUsername.charAt(0).toUpperCase() + displayUsername.slice(1).toLowerCase();
          }
          
          return {
            id: payload.userId || payload.user_id || payload.id || payload.sub || 0,
            username: displayUsername, // Use formatted display name
            email: email,
            city: payload.city || undefined,
            zipCode: payload.zipCode || payload.zip_code || undefined,
            street: payload.street || undefined,
            houseNumber: payload.houseNumber || payload.house_number || undefined,
            mobile: payload.mobile || payload.phone || undefined
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error decoding user from token:', error);
      return null;
    }
  }

  /**
   * Extract username from JWT payload with extensive fallbacks
   */
  private extractUsername(payload: any): string | null {
    // Try various username fields in order of preference
    const usernameFields = [
      'username',
      'user_name', 
      'preferred_username',
      'name',
      'given_name',
      'nickname',
      'login',
      'account_name',
      'display_name',
      'full_name'
    ];
    
    for (const field of usernameFields) {
      if (payload[field] && typeof payload[field] === 'string') {
        // Skip if it's just an email address
        if (!payload[field].includes('@')) {
          return payload[field];
        }
      }
    }
    
    return null;
  }

  /**
   * Extract email from JWT payload with fallbacks
   */
  private extractEmail(payload: any): string | null {
    // Try various email fields in order of preference
    const emailFields = [
      'email',
      'email_address',
      'mail',
      'emailAddress'
    ];
    
    for (const field of emailFields) {
      if (payload[field] && typeof payload[field] === 'string' && payload[field].includes('@')) {
        return payload[field];
      }
    }
    
    // Check if 'sub' contains an email (common in some JWT implementations)
    if (payload.sub && typeof payload.sub === 'string' && payload.sub.includes('@')) {
      return payload.sub;
    }
    
    return null;
  }

  /**
   * Decode JWT token payload
   */
  private decodeTokenPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token payload:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token?: string): boolean {
    const currentToken = token || this.currentToken;
    if (!currentToken) return true;

    try {
      const decoded = this.decodeTokenPayload(currentToken);
      if (!decoded?.exp) return true;

      const expirationDate = new Date(decoded.exp * 1000);
      return expirationDate < new Date();
    } catch {
      return true;
    }
  }

  /**
   * Auto-logout when token expires
   */
  checkTokenExpiration(): void {
    if (this.isAuthenticated && this.isTokenExpired()) {
      console.warn('Token expired, logging out');
      this.logout();
    }
  }

  /**
   * Redirect after successful login
   */
  private redirectAfterLogin(): void {
    try {
      const redirectUrl = localStorage.getItem('fap_redirect_url') || '/dashboard';
      localStorage.removeItem('fap_redirect_url');
      this.router.navigate([redirectUrl]);
    } catch (error) {
      console.error('Error during redirect:', error);
      this.router.navigate(['/dashboard']);
    }
  }
}
