import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GeocodingData } from './api.types';

@Injectable({
  providedIn: 'root'
})
export class GeocodeService {
  private readonly API_BASE_URL = '/api/v1/geocode';

  constructor(private http: HttpClient) {}

  /**
   * Get geocoding data by zip code
   */
  getLocationByZipCode(zipCode: string): Observable<GeocodingData> {
    return this.http.get<GeocodingData>(`${this.API_BASE_URL}/zip/${zipCode}`);
  }

  /**
   * Get geocoding data by coordinates
   */
  getLocationByCoordinates(latitude: number, longitude: number): Observable<GeocodingData> {
    const params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString());

    return this.http.get<GeocodingData>(`${this.API_BASE_URL}/coordinates`, { params });
  }

  /**
   * Get geocoding data by address
   */
  getLocationByAddress(
    street: string,
    housenumber: string,
    city: string,
    country: string
  ): Observable<GeocodingData> {
    const params = new HttpParams()
      .set('street', street)
      .set('housenumber', housenumber)
      .set('city', city)
      .set('country', country);

    return this.http.get<GeocodingData>(`${this.API_BASE_URL}/address`, { params });
  }
}
