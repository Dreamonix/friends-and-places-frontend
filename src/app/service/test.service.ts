import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE_URL = '/api/v1/test';

  /**
   * Test authenticated access
   */
  testSecuredEndpoint(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/secured`);
  }
}
