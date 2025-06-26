import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FriendsService } from '../../service/friends.service';
import { UserDTO, FriendRequestDTO } from '../../service/api.types';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';

interface FriendsState {
  friends: UserDTO[];
  receivedRequests: FriendRequestDTO[];
  sentRequests: FriendRequestDTO[];
  availableUsers: UserDTO[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    // Angular Material imports
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatListModule,
    MatDividerModule,
    MatGridListModule,
    MatTooltipModule
  ],
  templateUrl: './friends.component.html',
  styleUrls: ['./friends.component.css']
})
export class FriendsComponent implements OnInit {
  private readonly friendsService = inject(FriendsService);

  // Signals for reactive state management
  protected readonly friendsState = signal<FriendsState>({
    friends: [],
    receivedRequests: [],
    sentRequests: [],
    availableUsers: [],
    loading: false,
    error: null
  });

  // Computed values
  protected readonly friends = computed(() => this.friendsState().friends);
  protected readonly receivedRequests = computed(() => this.friendsState().receivedRequests);
  protected readonly sentRequests = computed(() => this.friendsState().sentRequests);
  protected readonly availableUsers = computed(() => this.friendsState().availableUsers);
  protected readonly loading = computed(() => this.friendsState().loading);
  protected readonly error = computed(() => this.friendsState().error);

  // View state
  protected readonly currentTab = signal<'friends' | 'requests' | 'discover'>('friends');
  protected readonly selectedTabIndex = signal(0);

  onTabChange(event: any) {
    const tabs = ['friends', 'requests', 'discover'] as const;
    this.currentTab.set(tabs[event.index]);
    this.selectedTabIndex.set(event.index);
  }

  // Computed filtered available users (exclude friends and pending requests)
  protected readonly usersToDiscover = computed(() => {
    const state = this.friendsState();
    const friendIds = new Set(state.friends.map(f => f.id));
    const sentRequestIds = new Set(state.sentRequests.map(r => r.receiver.id));
    const receivedRequestIds = new Set(state.receivedRequests.map(r => r.sender.id));
    
    return state.availableUsers.filter(user => 
      !friendIds.has(user.id) && 
      !sentRequestIds.has(user.id) && 
      !receivedRequestIds.has(user.id)
    );
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  protected setCurrentTab(tab: 'friends' | 'requests' | 'discover'): void {
    this.currentTab.set(tab);
    const tabIndex = ['friends', 'requests', 'discover'].indexOf(tab);
    this.selectedTabIndex.set(tabIndex);
  }

  protected loadAllData(): void {
    this.updateState({ loading: true, error: null });
    
    // Load all friend-related data in parallel using forkJoin
    forkJoin({
      friends: this.friendsService.getFriends(),
      receivedRequests: this.friendsService.getReceivedFriendRequests(),
      sentRequests: this.friendsService.getSentFriendRequests(),
      availableUsers: this.friendsService.getAllAvailableUsers()
    }).subscribe({
      next: ({ friends, receivedRequests, sentRequests, availableUsers }) => {
        this.updateState({
          friends: friends || [],
          receivedRequests: receivedRequests || [],
          sentRequests: sentRequests || [],
          availableUsers: availableUsers || [],
          loading: false,
          error: null
        });
      },
      error: (error) => {
        console.error('Error loading friends data:', error);
        this.updateState({
          loading: false,
          error: 'Failed to load friends data. Please try again.'
        });
      }
    });
  }

  protected sendFriendRequest(userId: number): void {
    this.friendsService.sendFriendRequest(userId).subscribe({
      next: (request) => {
        console.log('Friend request sent:', request);
        // Refresh data to update UI
        this.loadAllData();
      },
      error: (error) => {
        console.error('Error sending friend request:', error);
        this.updateState({ error: 'Failed to send friend request. Please try again.' });
      }
    });
  }

  protected acceptFriendRequest(requestId: number): void {
    this.friendsService.acceptFriendRequest(requestId).subscribe({
      next: (request) => {
        console.log('Friend request accepted:', request);
        this.loadAllData();
      },
      error: (error) => {
        console.error('Error accepting friend request:', error);
        this.updateState({ error: 'Failed to accept friend request. Please try again.' });
      }
    });
  }

  protected declineFriendRequest(requestId: number): void {
    this.friendsService.declineFriendRequest(requestId).subscribe({
      next: (request) => {
        console.log('Friend request declined:', request);
        this.loadAllData();
      },
      error: (error) => {
        console.error('Error declining friend request:', error);
        this.updateState({ error: 'Failed to decline friend request. Please try again.' });
      }
    });
  }

  protected cancelFriendRequest(requestId: number): void {
    this.friendsService.cancelFriendRequest(requestId).subscribe({
      next: (request) => {
        console.log('Friend request canceled:', request);
        this.loadAllData();
      },
      error: (error) => {
        console.error('Error canceling friend request:', error);
        this.updateState({ error: 'Failed to cancel friend request. Please try again.' });
      }
    });
  }

  protected removeFriend(friendId: number): void {
    if (confirm('Are you sure you want to remove this friend?')) {
      this.friendsService.removeFriend(friendId).subscribe({
        next: () => {
          console.log('Friend removed');
          this.loadAllData();
        },
        error: (error) => {
          console.error('Error removing friend:', error);
          this.updateState({ error: 'Failed to remove friend. Please try again.' });
        }
      });
    }
  }

  protected formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  }

  protected clearError(): void {
    this.updateState({ error: null });
  }

  private updateState(updates: Partial<FriendsState>): void {
    this.friendsState.update(current => ({ ...current, ...updates }));
  }
}
