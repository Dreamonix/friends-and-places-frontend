import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { PlacesService } from '../../service/places.service';
import { LocationCreateDTO, LocationResponseDTO } from '../../service/api.types';

@Component({
  selector: 'app-places',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  template: `
    <div class="places-container">
      <div class="places-header">
        <h1><mat-icon>place</mat-icon> My Places</h1>
        <p>Log your current location and view your location history</p>
      </div>

      <mat-tab-group class="places-tabs">
        <!-- Log New Location Tab -->
        <mat-tab label="Log Location">
          <div class="tab-content">
            <mat-card class="location-form-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>add_location</mat-icon>
                  Log New Location
                </mat-card-title>
                <mat-card-subtitle>Add your current location or a specific address</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <!-- Quick Current Location Button -->
                <div class="quick-location">
                  <button 
                    mat-raised-button 
                    color="primary" 
                    (click)="getCurrentLocation()"
                    [disabled]="isLoading()"
                    class="current-location-btn">
                    <mat-icon>my_location</mat-icon>
                    {{ isLoading() ? 'Getting Location...' : 'Use Current Location' }}
                  </button>
                </div>

                <mat-divider></mat-divider>

                <!-- Manual Location Form -->
                <form [formGroup]="locationForm" (ngSubmit)="onSubmitLocation()" class="location-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Location Name (Optional)</mat-label>
                      <input matInput formControlName="locationName" placeholder="e.g., Home, Office, Vacation Spot">
                      <mat-icon matSuffix>label</mat-icon>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Latitude</mat-label>
                      <input matInput type="number" formControlName="latitude" step="any" placeholder="52.5200">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Longitude</mat-label>
                      <input matInput type="number" formControlName="longitude" step="any" placeholder="13.4050">
                    </mat-form-field>
                  </div>

                  <div class="form-divider">
                    <span>OR</span>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Street</mat-label>
                      <input matInput formControlName="street" placeholder="Unter den Linden">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>House Number</mat-label>
                      <input matInput formControlName="housenumber" placeholder="1">
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>City</mat-label>
                      <input matInput formControlName="city" placeholder="Berlin">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="half-width">
                      <mat-label>Country</mat-label>
                      <input matInput formControlName="country" placeholder="Germany">
                    </mat-form-field>
                  </div>

                  <div class="form-actions">
                    <button 
                      mat-raised-button 
                      color="primary" 
                      type="submit"
                      [disabled]="locationForm.invalid || isLoading()">
                      <mat-icon>save</mat-icon>
                      {{ isLoading() ? 'Saving...' : 'Save Location' }}
                    </button>
                    <button 
                      mat-button 
                      type="button" 
                      (click)="resetForm()">
                      <mat-icon>clear</mat-icon>
                      Clear
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Current Location Tab -->
        <mat-tab label="Current Location">
          <div class="tab-content">
            <mat-card class="current-location-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>location_on</mat-icon>
                  Your Current Location
                </mat-card-title>
              </mat-card-header>

              <mat-card-content>
                <div *ngIf="currentLocation(); else noCurrentLocation" class="location-display">
                  <div class="location-info">
                    <h3>{{ currentLocation()?.locationName || 'Current Location' }}</h3>
                    <p class="address">{{ currentLocation()?.formattedAddress }}</p>
                    <div class="coordinates">
                      <span><strong>Lat:</strong> {{ currentLocation()!.latitude.toFixed(6) }}</span>
                      <span><strong>Lng:</strong> {{ currentLocation()!.longitude.toFixed(6) }}</span>
                    </div>
                    <p class="timestamp">
                      <mat-icon>schedule</mat-icon>
                      {{ currentLocation()?.createdAt | date:'medium' }}
                    </p>
                  </div>
                </div>

                <ng-template #noCurrentLocation>
                  <div class="no-location">
                    <mat-icon>location_off</mat-icon>
                    <p>No current location found</p>
                    <button mat-raised-button color="primary" (click)="loadCurrentLocation()">
                      <mat-icon>refresh</mat-icon>
                      Refresh
                    </button>
                  </div>
                </ng-template>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Location History Tab -->
        <mat-tab label="Location History">
          <div class="tab-content">
            <mat-card class="history-card">
              <mat-card-header>
                <mat-card-title>
                  <mat-icon>history</mat-icon>
                  Location History
                </mat-card-title>
                <mat-card-subtitle>All your logged locations</mat-card-subtitle>
              </mat-card-header>

              <mat-card-content>
                <div *ngIf="isLoadingHistory()" class="loading-state">
                  <mat-spinner diameter="40"></mat-spinner>
                  <p>Loading location history...</p>
                </div>

                <div *ngIf="!isLoadingHistory() && locationHistory().length > 0" class="history-list">
                  <div *ngFor="let location of locationHistory(); trackBy: trackByLocationId" 
                       class="location-item">
                    <div class="location-icon">
                      <mat-icon>place</mat-icon>
                    </div>
                    <div class="location-details">
                      <h4>{{ location.locationName || 'Unnamed Location' }}</h4>
                      <p class="address">{{ location.formattedAddress }}</p>
                      <div class="location-meta">
                        <span class="coordinates">
                          {{ location.latitude.toFixed(4) }}, {{ location.longitude.toFixed(4) }}
                        </span>
                        <span class="timestamp">
                          <mat-icon>schedule</mat-icon>
                          {{ location.createdAt | date:'short' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="!isLoadingHistory() && locationHistory().length === 0" class="no-history">
                  <mat-icon>location_off</mat-icon>
                  <p>No location history found</p>
                  <p>Start by logging your first location!</p>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styleUrls: ['./places.component.css']
})
export class PlacesComponent implements OnInit, OnDestroy {
  private readonly placesService = inject(PlacesService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  // Signals for reactive state management
  protected readonly isLoading = signal(false);
  protected readonly isLoadingHistory = signal(false);
  protected readonly currentLocation = signal<LocationResponseDTO | null>(null);
  protected readonly locationHistory = signal<LocationResponseDTO[]>([]);

  // Form for manual location entry
  protected readonly locationForm: FormGroup;

  constructor() {
    this.locationForm = this.fb.group({
      locationName: [''],
      latitude: [''],
      longitude: [''],
      street: [''],
      housenumber: [''],
      city: [''],
      country: ['']
    });
  }

  ngOnInit(): void {
    this.loadCurrentLocation();
    this.loadLocationHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get user's current location using browser geolocation
   */
  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('Geolocation is not supported by this browser', 'Close', {
        duration: 3000
      });
      return;
    }

    this.isLoading.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationCreateDTO = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationName: 'Current Location'
        };

        this.saveLocation(location);
      },
      (error) => {
        this.isLoading.set(false);
        let message = 'Failed to get current location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }

        this.snackBar.open(message, 'Close', { duration: 5000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  /**
   * Submit manual location form
   */
  onSubmitLocation(): void {
    if (this.locationForm.valid) {
      const formValue = this.locationForm.value;
      
      // Check if we have coordinates or address
      const hasCoordinates = formValue.latitude && formValue.longitude;
      const hasAddress = formValue.street && formValue.city && formValue.country;

      if (!hasCoordinates && !hasAddress) {
        this.snackBar.open('Please provide either coordinates or a complete address', 'Close', {
          duration: 3000
        });
        return;
      }

      const location: LocationCreateDTO = {
        locationName: formValue.locationName || undefined,
        latitude: formValue.latitude || undefined,
        longitude: formValue.longitude || undefined,
        street: formValue.street || undefined,
        housenumber: formValue.housenumber || undefined,
        city: formValue.city || undefined,
        country: formValue.country || undefined
      };

      this.saveLocation(location);
    }
  }

  /**
   * Save location to backend
   */
  private saveLocation(location: LocationCreateDTO): void {
    this.isLoading.set(true);

    this.placesService.addLocation(location)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error saving location:', error);
          this.snackBar.open('Failed to save location', 'Close', { duration: 3000 });
          return of(null);
        })
      )
      .subscribe(response => {
        this.isLoading.set(false);
        
        if (response) {
          this.snackBar.open('Location saved successfully!', 'Close', { duration: 3000 });
          this.resetForm();
          this.loadCurrentLocation();
          this.loadLocationHistory();
        }
      });
  }

  /**
   * Load current (latest) location
   */
  loadCurrentLocation(): void {
    this.placesService.getLatestLocation()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading current location:', error);
          return of(null);
        })
      )
      .subscribe(location => {
        this.currentLocation.set(location);
      });
  }

  /**
   * Load location history
   */
  loadLocationHistory(): void {
    this.isLoadingHistory.set(true);

    this.placesService.getAllLocations()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading location history:', error);
          this.snackBar.open('Failed to load location history', 'Close', { duration: 3000 });
          return of([]);
        })
      )
      .subscribe(locations => {
        this.locationHistory.set(locations);
        this.isLoadingHistory.set(false);
      });
  }

  /**
   * Reset the location form
   */
  resetForm(): void {
    this.locationForm.reset();
  }

  /**
   * Track by function for ngFor
   */
  trackByLocationId(index: number, location: LocationResponseDTO): number {
    return location.id;
  }
}
