import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlacesService } from '../../service/places.service';
import { FriendsService } from '../../service/friends.service';
import { LocationResponseDTO, UserDTO } from '../../service/api.types';
import { combineLatest, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

declare let L: any;

@Component({
  selector: 'app-friends-map',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <mat-card class="friends-map-card">
      <mat-card-header>
        <mat-icon mat-card-avatar>map</mat-icon>
        <mat-card-title>Friends Locations</mat-card-title>
        <mat-card-subtitle>See where your friends are on the map</mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <div *ngIf="loading()" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading friends locations...</p>
        </div>
        
        <div *ngIf="error()" class="error-container">
          <mat-icon color="warn">error</mat-icon>
          <p>{{ error() }}</p>
          <button mat-button color="primary" (click)="loadFriendsLocations()">
            <mat-icon>refresh</mat-icon>
            Retry
          </button>
        </div>
        
        <div *ngIf="!loading() && !error()" class="map-container">
          <div id="friends-map" class="map"></div>
          <div class="map-info">
            <p><strong>{{ friendsWithLocations().length }}</strong> friends with locations</p>
            <p *ngIf="friendsWithLocations().length === 0" class="no-locations">
              Your friends haven't shared their locations yet.
            </p>
          </div>
        </div>
      </mat-card-content>
      
      <mat-card-actions align="end">
        <button mat-button (click)="loadFriendsLocations()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styleUrls: ['./friends-map.component.css']
})
export class FriendsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly placesService = inject(PlacesService);
  private readonly friendsService = inject(FriendsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly platformId = inject(PLATFORM_ID);

  // Signals for reactive state
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly friendsWithLocations = signal<LocationResponseDTO[]>([]);

  private map: any = null;
  private markers: any[] = [];

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadLeaflet().then(() => {
        // Don't load friends locations here, wait for view init
      });
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Load friends locations after view is initialized
      setTimeout(() => {
        this.loadFriendsLocations();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private async loadLeaflet(): Promise<void> {
    if (typeof L === 'undefined') {
      // Dynamically import Leaflet
      const leaflet = await import('leaflet');
      (window as any).L = leaflet.default || leaflet;
      
      // Load Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Fix default markers (important for Angular)
      const icon = leaflet.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      (leaflet as any).Marker.prototype.options.icon = icon;
    }
  }

  protected loadFriendsLocations(): void {
    this.loading.set(true);
    this.error.set(null);

    // Get friends and their locations
    combineLatest([
      this.friendsService.getFriends(),
      this.placesService.getFriendsLocations()
    ]).pipe(
      map(([friends, locations]) => {
        // Filter locations that have valid coordinates
        return locations.filter(location => 
          location.latitude && 
          location.longitude && 
          !isNaN(location.latitude) && 
          !isNaN(location.longitude)
        );
      }),
      catchError(error => {
        console.error('Error loading friends locations:', error);
        this.error.set(error.message || 'Failed to load friends locations');
        return of([]);
      })
    ).subscribe({
      next: (locations) => {
        this.friendsWithLocations.set(locations);
        this.loading.set(false);
        this.initializeMap();
      },
      error: (error) => {
        this.error.set(error.message || 'Failed to load friends locations');
        this.loading.set(false);
      }
    });
  }

  private initializeMap(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Wait for CSS to load before initializing map
    setTimeout(() => {
      // Remove existing map if it exists
      if (this.map) {
        this.map.remove();
      }

      // Clear existing markers
      this.markers = [];

      const mapElement = document.getElementById('friends-map');
      if (!mapElement) {
        console.error('Map element not found');
        return;
      }

      // Initialize map with proper imported Leaflet
      const L = (window as any).L;
      if (!L) {
        console.error('Leaflet not loaded');
        return;
      }

      this.map = L.map('friends-map').setView([51.505, -0.09], 2); // Default center

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      const locations = this.friendsWithLocations();
      
      if (locations.length === 0) {
        // Show a default view if no locations
        this.map.setView([51.505, -0.09], 2);
        return;
      }

      // Add markers for each friend location
      const bounds = L.latLngBounds();
      
      locations.forEach(location => {
        const marker = L.marker([location.latitude, location.longitude])
          .addTo(this.map)
          .bindPopup(`
            <div class="friend-popup">
              <h4>${location.username}</h4>
              <p><strong>Location:</strong> ${location.formattedAddress}</p>
              <p><small>Added: ${new Date(location.createdAt).toLocaleDateString()}</small></p>
            </div>
          `);

        this.markers.push(marker);
        bounds.extend([location.latitude, location.longitude]);
      });

      // Fit map to show all markers
      if (locations.length === 1) {
        this.map.setView([locations[0].latitude, locations[0].longitude], 10);
      } else if (locations.length > 1) {
        this.map.fitBounds(bounds, { padding: [20, 20] });
      }

      // Force map size invalidation after a brief delay
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    }, 500); // Wait for CSS to load
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
