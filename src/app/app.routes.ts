import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FriendsComponent } from './components/friends/friends.component';
import { PlacesComponent } from './components/places/places.component';
import { authGuard, guestGuard } from './service/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'auth', 
    component: AuthComponent,
    canActivate: [guestGuard] // Redirect authenticated users away from auth page
  },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard] // Protect dashboard with authentication
  },
  { 
    path: 'friends', 
    component: FriendsComponent,
    canActivate: [authGuard] // Protect friends page with authentication
  },
  { 
    path: 'places', 
    component: PlacesComponent,
    canActivate: [authGuard] // Protect places page with authentication
  },
  { path: '**', redirectTo: '/dashboard' } // Wildcard route
];
