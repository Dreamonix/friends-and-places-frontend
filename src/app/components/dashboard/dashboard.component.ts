import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { PlacesService } from '../../service/places.service';
import { FriendsService } from '../../service/friends.service';
import { TestService } from '../../service/test.service';
import { AuthState, User } from '../../service/auth.types';
import { FriendsMapComponent } from '../friends-map/friends-map.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FriendsMapComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly placesService = inject(PlacesService);
  private readonly friendsService = inject(FriendsService);
  private readonly testService = inject(TestService);
  private readonly router = inject(Router);

  // Signals for reactive state
  protected readonly authState = signal<AuthState | null>(null);
  protected readonly testResult = signal<{success: boolean, message: string} | null>(null);
  protected readonly testLoading = signal(false);

  // Computed properties
  protected readonly user = computed(() => this.authState()?.user || null);
  protected readonly tokenValid = computed(() => {
    const state = this.authState();
    return state?.isAuthenticated && state?.token ? true : false;
  });
  protected readonly currentLoginTime = computed(() => {
    return this.authState()?.user ? new Date().toLocaleString() : 'Not available';
  });

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authService.authState$.subscribe(state => {
      this.authState.set(state);
    });
  }

  protected onLogout(): void {
    this.authService.logout();
  }

  protected testSecuredEndpoint(): void {
    this.testLoading.set(true);
    this.testResult.set(null);

    this.testService.testSecuredEndpoint().subscribe({
      next: (response) => {
        const responseText = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
        this.testResult.set({
          success: true,
          message: `✅ Success!\n\nResponse:\n${responseText}`
        });
      },
      error: (error) => {
        this.testResult.set({
          success: false,
          message: `❌ Error: ${error.message || 'Failed to connect to secured endpoint'}\n\nThis is normal if the endpoint requires authentication or doesn't exist.`
        });
      },
      complete: () => {
        this.testLoading.set(false);
      }
    });
  }

  protected loadFriends(): void {
    // Navigate to the dedicated friends page
    this.router.navigate(['/friends']);
  }

  protected loadPlaces(): void {
    this.placesService.getAllLocations().subscribe({
      next: (places) => {
        console.log('Places loaded:', places);
        alert(`Loaded ${places.length} places`);
      },
      error: (error) => {
        console.error('Error loading places:', error);
        alert(`Error: ${error.message}`);
      }
    });
  }

  protected loadAvailableUsers(): void {
    this.friendsService.getAllAvailableUsers().subscribe({
      next: (users) => {
        console.log('Available users loaded:', users);
        alert(`Found ${users.length} available users`);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        alert(`Error: ${error.message}`);
      }
    });
  }

  protected formatTimestamp(timestamp: string): string {
    if (timestamp === 'Unknown') return timestamp;
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Unknown';
    }
  }

  protected debugAuthState(): void {
    const state = this.authState();
    const token = state?.token;
    
    console.group('🔍 Authentication Debug Info');
    console.log('Current Auth State:', state);
    console.log('Current User:', this.user());
    console.log('Token Valid:', this.tokenValid());
    console.log('Auth Service State:', this.authService.currentAuthState);
    
    if (token) {
      try {
        // Decode token payload for debugging
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        console.log('🔑 JWT Payload:', payload);
        console.log('📋 Available fields:', Object.keys(payload));
        
        // Log common user fields that might be available
        const userFields = ['sub', 'email', 'username', 'user_name', 'preferred_username', 
                           'name', 'given_name', 'family_name', 'nickname'];
        console.log('👤 User-related fields found:');
        userFields.forEach(field => {
          if (payload[field]) {
            console.log(`  ${field}: ${payload[field]}`);
          }
        });
      } catch (error) {
        console.error('❌ Error decoding token:', error);
      }
    } else {
      console.log('⚠️ No token available');
    }
    console.groupEnd();
    
    // Show user-friendly alert
    const user = this.user();
    const debugInfo = `
🔍 Debug Information (check console for details):

Auth Status: ${state?.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
Email: ${user?.email || 'Not available'}
Token exists: ${!!token ? '✅ Yes' : '❌ No'}

More details logged to browser console (F12).
    `.trim();
    
    alert(debugInfo);
  }

    
}
