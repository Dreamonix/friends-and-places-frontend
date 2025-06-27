import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { AuthService } from '../../service/auth.service';
import { UserLoginDTO, UserRegisterDTO, AuthState } from '../../service/auth.types';

// Custom validators
function emailValidator(control: AbstractControl) {
  const email = control.value;
  if (!email) return null;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) ? null : { invalidEmail: true };
}

function passwordValidator(control: AbstractControl) {
  const password = control.value;
  if (!password) return null;
  
  // At least 8 characters, one letter, one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password) ? null : { weakPassword: true };
}

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <header class="auth-header">
          <h1>{{ isLoginMode() ? 'Welcome Back' : 'Join Friends & Places' }}</h1>
          <p>{{ isLoginMode() ? 'Sign in to your account' : 'Create your account to get started' }}</p>
        </header>

        <!-- Login Form -->
        <form *ngIf="isLoginMode()" [formGroup]="loginForm" (ngSubmit)="onLogin()" class="auth-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              formControlName="email" 
              [class.error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
              placeholder="Enter your email"
              autocomplete="email">
            <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="field-error">
              <span *ngIf="loginForm.get('email')?.hasError('required')">Email is required</span>
              <span *ngIf="loginForm.get('email')?.hasError('invalidEmail')">Please enter a valid email</span>
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              formControlName="password"
              [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
              placeholder="Enter your password"
              autocomplete="current-password">
            <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="field-error">
              <span *ngIf="loginForm.get('password')?.hasError('required')">Password is required</span>
            </div>
          </div>

          <button 
            type="submit" 
            [disabled]="loginForm.invalid || isLoading()"
            [class.loading]="isLoading()"
            class="submit-btn">
            {{ isLoading() ? 'Signing in...' : 'Sign In' }}
            <!-- Debug: {{ 'DEBUG: isLoading=' + isLoading() + ', text=' + (isLoading() ? 'Signing in...' : 'Sign In') }} -->
          </button>
        </form>

        <!-- Registration Form -->
        <form *ngIf="!isLoginMode()" [formGroup]="registerForm" (ngSubmit)="onRegister()" class="auth-form">
          <div class="form-row">
            <div class="form-group half">
              <label for="reg-username">Username</label>
              <input 
                type="text" 
                id="reg-username" 
                formControlName="username"
                [class.error]="registerForm.get('username')?.invalid && registerForm.get('username')?.touched"
                [class.success]="usernameAvailable() && registerForm.get('username')?.valid"
                placeholder="Choose a username"
                autocomplete="username">
              <div *ngIf="registerForm.get('username')?.invalid && registerForm.get('username')?.touched" class="field-error">
                <span *ngIf="registerForm.get('username')?.hasError('required')">Username is required</span>
                <span *ngIf="registerForm.get('username')?.hasError('minlength')">Username must be at least 3 characters</span>
              </div>
              <div *ngIf="usernameAvailable() && registerForm.get('username')?.valid" class="field-success">
                ✓ Username is available
              </div>
            </div>

            <div class="form-group half">
              <label for="reg-email">Email Address</label>
              <input 
                type="email" 
                id="reg-email" 
                formControlName="email"
                [class.error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                [class.success]="emailAvailable() && registerForm.get('email')?.valid"
                placeholder="Enter your email"
                autocomplete="email">
              <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="field-error">
                <span *ngIf="registerForm.get('email')?.hasError('required')">Email is required</span>
                <span *ngIf="registerForm.get('email')?.hasError('invalidEmail')">Please enter a valid email</span>
              </div>
              <div *ngIf="emailAvailable() && registerForm.get('email')?.valid" class="field-success">
                ✓ Email is available
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="reg-password">Password</label>
            <input 
              type="password" 
              id="reg-password" 
              formControlName="password"
              [class.error]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
              placeholder="Create a strong password"
              autocomplete="new-password">
            <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="field-error">
              <span *ngIf="registerForm.get('password')?.hasError('required')">Password is required</span>
              <span *ngIf="registerForm.get('password')?.hasError('weakPassword')">
                Password must be at least 8 characters with letters and numbers
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label for="city">City</label>
              <input 
                type="text" 
                id="city" 
                formControlName="city"
                [class.error]="registerForm.get('city')?.invalid && registerForm.get('city')?.touched"
                placeholder="Your city">
              <div *ngIf="registerForm.get('city')?.invalid && registerForm.get('city')?.touched" class="field-error">
                <span *ngIf="registerForm.get('city')?.hasError('required')">City is required</span>
              </div>
            </div>

            <div class="form-group half">
              <label for="zipCode">ZIP Code</label>
              <input 
                type="text" 
                id="zipCode" 
                formControlName="zipCode"
                [class.error]="registerForm.get('zipCode')?.invalid && registerForm.get('zipCode')?.touched"
                placeholder="ZIP code">
              <div *ngIf="registerForm.get('zipCode')?.invalid && registerForm.get('zipCode')?.touched" class="field-error">
                <span *ngIf="registerForm.get('zipCode')?.hasError('required')">ZIP code is required</span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group half">
              <label for="street">Street</label>
              <input 
                type="text" 
                id="street" 
                formControlName="street"
                [class.error]="registerForm.get('street')?.invalid && registerForm.get('street')?.touched"
                placeholder="Street name">
              <div *ngIf="registerForm.get('street')?.invalid && registerForm.get('street')?.touched" class="field-error">
                <span *ngIf="registerForm.get('street')?.hasError('required')">Street is required</span>
              </div>
            </div>

            <div class="form-group half">
              <label for="houseNumber">House Number</label>
              <input 
                type="text" 
                id="houseNumber" 
                formControlName="houseNumber"
                [class.error]="registerForm.get('houseNumber')?.invalid && registerForm.get('houseNumber')?.touched"
                placeholder="House number">
              <div *ngIf="registerForm.get('houseNumber')?.invalid && registerForm.get('houseNumber')?.touched" class="field-error">
                <span *ngIf="registerForm.get('houseNumber')?.hasError('required')">House number is required</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="mobile">Mobile Phone</label>
            <input 
              type="tel" 
              id="mobile" 
              formControlName="mobile"
              [class.error]="registerForm.get('mobile')?.invalid && registerForm.get('mobile')?.touched"
              placeholder="Your mobile number"
              autocomplete="tel">
            <div *ngIf="registerForm.get('mobile')?.invalid && registerForm.get('mobile')?.touched" class="field-error">
              <span *ngIf="registerForm.get('mobile')?.hasError('required')">Mobile number is required</span>
            </div>
          </div>

          <button 
            type="submit" 
            [disabled]="registerForm.invalid || isLoading()"
            [class.loading]="isLoading()"
            class="submit-btn">
            {{ isLoading() ? 'Creating Account...' : 'Create Account' }}
            <!-- Debug: {{ 'DEBUG: isLoading=' + isLoading() + ', text=' + (isLoading() ? 'Creating Account...' : 'Create Account') }} -->
          </button>
        </form>

        <!-- Toggle Mode -->
        <div class="auth-toggle">
          <p>
            {{ isLoginMode() ? "Don't have an account?" : "Already have an account?" }}
            <button type="button" (click)="toggleMode()" class="toggle-btn">
              {{ isLoginMode() ? 'Sign Up' : 'Sign In' }}
            </button>
          </p>
        </div>

        <!-- Error Display -->
        <div *ngIf="errorMessage()" class="error-message" role="alert">
          {{ errorMessage() }}
        </div>

        <!-- Success Message -->
        <div *ngIf="successMessage()" class="success-message" role="status">
          {{ successMessage() }}
        </div>
      </div>        <!-- Auth State Debug (development only) -->
        <div *ngIf="authState$ | async as authState" class="auth-debug">
          <h3>🔍 Debug Information</h3>
          <div class="debug-info">
            <p><strong>Loading State:</strong> {{ isLoading() }}</p>
            <p><strong>Login Form Valid:</strong> {{ loginForm.valid }}</p>
            <p><strong>Register Form Valid:</strong> {{ registerForm.valid }}</p>
            <p><strong>Authenticated:</strong> {{ authState.isAuthenticated ? 'Yes' : 'No' }}</p>
            <p *ngIf="authState.user"><strong>User:</strong> {{ authState.user.username }} ({{ authState.user.email }})</p>
            <button type="button" (click)="debugComponentState()" class="debug-btn">Log State</button>
            <button type="button" (click)="resetLoadingState()" class="debug-btn">Reset Loading</button>
            <button *ngIf="authState.isAuthenticated" (click)="onLogout()" class="logout-btn">Logout</button>
          </div>
        </div>
    </div>
  `,
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  // Signals for reactive state management
  protected readonly isLoginMode = signal(true);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly usernameAvailable = signal(false);
  protected readonly emailAvailable = signal(false);

  // Reactive forms
  protected readonly loginForm: FormGroup;
  protected readonly registerForm: FormGroup;

  // Auth state observable
  protected readonly authState$ = this.authService.authState$;

  constructor() {
    // Initialize forms with proper validation
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, emailValidator]],
      password: ['', [Validators.required]]
    });

    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, emailValidator]],
      password: ['', [Validators.required, passwordValidator]],
      city: ['', [Validators.required]],
      zipCode: ['', [Validators.required]],
      street: ['', [Validators.required]],
      houseNumber: ['', [Validators.required]],
      mobile: ['', [Validators.required]]
    });

    // Debug logging for loading state
    console.log('AuthComponent: constructor - isLoading state:', this.isLoading());
  }

  ngOnInit(): void {
    console.log('AuthComponent: ngOnInit - isLoading initial state:', this.isLoading());
    this.setupFormValidation();
    this.subscribeToAuthState();
    
    // Add a safety check to ensure loading state is false on init
    if (this.isLoading()) {
      console.warn('AuthComponent: Loading state was true on init, resetting to false');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.clearMessages();

    const credentials: UserLoginDTO = this.loginForm.value;

    this.authService.login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage.set('Login successful! Redirecting...');
          this.loginForm.reset();
        },
        error: (error) => {
          this.errorMessage.set(error.message);
        },
        complete: () => {
          this.isLoading.set(false);
        }
      });
  }

  protected onRegister(): void {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.clearMessages();

    const userData: UserRegisterDTO = this.registerForm.value;

    this.authService.register(userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage.set('Registration successful! You can now sign in.');
          this.registerForm.reset();
          this.isLoginMode.set(true);
        },
        error: (error) => {
          this.errorMessage.set(error.message);
        },
        complete: () => {
          this.isLoading.set(false);
        }
      });
  }

  protected onLogout(): void {
    this.authService.logout();
  }

  protected toggleMode(): void {
    this.isLoginMode.update(mode => !mode);
    this.clearMessages();
    this.loginForm.reset();
    this.registerForm.reset();
  }

  private setupFormValidation(): void {
    // Username availability check
    this.registerForm.get('username')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(username => {
          if (!username || username.length < 3) {
            this.usernameAvailable.set(false);
            return of(false);
          }
          
          return this.authService.checkUsername(username).pipe(
            catchError(() => of(false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(available => {
        this.usernameAvailable.set(available);
      });

    // Email availability check
    this.registerForm.get('email')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(email => {
          if (!email || this.registerForm.get('email')?.hasError('invalidEmail')) {
            this.emailAvailable.set(false);
            return of(false);
          }
          
          return this.authService.checkEmail(email).pipe(
            catchError(() => of(false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(available => {
        this.emailAvailable.set(available);
      });
  }

  private subscribeToAuthState(): void {
    this.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: AuthState) => {
        console.log('Auth state changed:', state);
        // Handle auth state changes if needed
      });
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  /**
   * Debug method to log component state
   */
  protected debugComponentState(): void {
    console.group('🔍 AuthComponent Debug State');
    console.log('isLoading:', this.isLoading());
    console.log('isLoginMode:', this.isLoginMode());
    console.log('errorMessage:', this.errorMessage());
    console.log('successMessage:', this.successMessage());
    console.log('usernameAvailable:', this.usernameAvailable());
    console.log('emailAvailable:', this.emailAvailable());
    console.log('loginForm valid:', this.loginForm.valid);
    console.log('loginForm errors:', this.loginForm.errors);
    console.log('registerForm valid:', this.registerForm.valid);
    console.log('registerForm errors:', this.registerForm.errors);
    console.groupEnd();
  }

  /**
   * Emergency method to reset loading state if it gets stuck
   */
  protected resetLoadingState(): void {
    this.isLoading.set(false);
    this.clearMessages();
    console.log('🔄 Loading state reset to false');
  }
}
