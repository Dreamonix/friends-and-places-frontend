import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LocationCreateDTO, LocationResponseDTO } from './api.types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE_URL = `${environment.apiUrl}/places`;

  /**
   * Get all locations for the authenticated user
   */
  getAllLocations(): Observable<LocationResponseDTO[]> {
    return this.http.get<LocationResponseDTO[]>(this.API_BASE_URL)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Log a new location
   */
  addLocation(location: LocationCreateDTO): Observable<LocationResponseDTO> {
    if (!this.isValidLocation(location)) {
      return throwError(() => new Error('Invalid location data provided'));
    }

    return this.http.put<LocationResponseDTO>(this.API_BASE_URL, location)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get latest location for the authenticated user
   */
  getLatestLocation(): Observable<LocationResponseDTO> {
    return this.http.get<LocationResponseDTO>(`${this.API_BASE_URL}/latest`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get friends' locations
   */
  getFriendsLocations(): Observable<LocationResponseDTO[]> {
    return this.http.get<LocationResponseDTO[]>(`${this.API_BASE_URL}/friends`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get user's location by username (only if you're friends)
   */
  getUserLocationByUsername(username: string): Observable<LocationResponseDTO> {
    if (!username?.trim()) {
      return throwError(() => new Error('Username is required'));
    }

    return this.http.get<LocationResponseDTO>(`${this.API_BASE_URL}/user/${encodeURIComponent(username.trim())}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Validate location data before sending to API
   */
  private isValidLocation(location: LocationCreateDTO): boolean {
    // Either coordinates OR address components must be provided
    const hasCoordinates = location.latitude !== undefined && location.longitude !== undefined;
    const hasAddress = !!(location.street && location.city && location.country);
    
    return hasCoordinates || hasAddress;
  }

  /**
   * Handle HTTP errors with user-friendly messages
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let userMessage = 'An unexpected error occurred while processing your location request.';
    
    switch (error.status) {
      case 400:
        userMessage = error.error?.message || 'Invalid location data provided.';
        break;
      case 401:
        userMessage = 'You must be logged in to access location services.';
        break;
      case 403:
        userMessage = 'You do not have permission to access this location.';
        break;
      case 404:
        userMessage = 'The requested location was not found.';
        break;
      case 500:
        userMessage = 'Server error while processing location request. Please try again later.';
        break;
      default:
        if (error.error?.message) {
          userMessage = error.error.message;
        }
    }

    console.error('Places Service Error:', error);
    return throwError(() => new Error(userMessage));
  }
}
