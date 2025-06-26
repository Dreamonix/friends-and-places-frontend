import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FriendRequestDTO, UserDTO } from './api.types';

@Injectable({
  providedIn: 'root'
})
export class FriendsService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE_URL = '/api/v1/friends';

  /**
   * Get all friends of the current user
   */
  getFriends(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(this.API_BASE_URL);
  }

  /**
   * Get all available users in the system
   */
  getAllAvailableUsers(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.API_BASE_URL}/available-users`);
  }

  /**
   * Get all pending friend requests sent by the current user
   */
  getSentFriendRequests(): Observable<FriendRequestDTO[]> {
    return this.http.get<FriendRequestDTO[]>(`${this.API_BASE_URL}/requests/sent`);
  }

  /**
   * Get all pending friend requests received by the current user
   */
  getReceivedFriendRequests(): Observable<FriendRequestDTO[]> {
    return this.http.get<FriendRequestDTO[]>(`${this.API_BASE_URL}/requests/received`);
  }

  /**
   * Send a friend request
   */
  sendFriendRequest(receiverId: number): Observable<FriendRequestDTO> {
    return this.http.post<FriendRequestDTO>(`${this.API_BASE_URL}/requests/${receiverId}`, {});
  }

  /**
   * Accept a friend request
   */
  acceptFriendRequest(requestId: number): Observable<FriendRequestDTO> {
    return this.http.post<FriendRequestDTO>(`${this.API_BASE_URL}/requests/${requestId}/accept`, {});
  }

  /**
   * Decline a friend request
   */
  declineFriendRequest(requestId: number): Observable<FriendRequestDTO> {
    return this.http.post<FriendRequestDTO>(`${this.API_BASE_URL}/requests/${requestId}/decline`, {});
  }

  /**
   * Cancel a friend request
   */
  cancelFriendRequest(requestId: number): Observable<FriendRequestDTO> {
    return this.http.post<FriendRequestDTO>(`${this.API_BASE_URL}/requests/${requestId}/cancel`, {});
  }

  /**
   * Remove a friend
   */
  removeFriend(friendId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/${friendId}`);
  }
}
