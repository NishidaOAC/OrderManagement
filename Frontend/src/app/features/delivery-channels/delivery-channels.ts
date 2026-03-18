import { Component, inject, signal } from '@angular/core';
import { UserService, UserListItem } from '../../core/services/user.service';

@Component({
  selector: 'app-delivery-channels',
  imports: [],
  templateUrl: './delivery-channels.html',
  styleUrl: './delivery-channels.scss',
})
export class DeliveryChannels {
  private readonly userService = inject(UserService);

  loading = signal(false);
  errorMessage = signal('');
  users = signal<UserListItem[]>([]);
  deactivatingUserId = signal<number | null>(null);

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.userService.getUsers().subscribe({
      next: ({ users }) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Failed to load users');
        this.loading.set(false);
      },
    });
  }

  deactivate(user: UserListItem): void {
    if (!user.is_active || this.deactivatingUserId() === user.id) {
      return;
    }

    this.deactivatingUserId.set(user.id);
    this.userService.deactivateUser(user.id).subscribe({
      next: () => {
        this.users.update((current) =>
          current.map((item) => (item.id === user.id ? { ...item, is_active: false } : item))
        );
        this.deactivatingUserId.set(null);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Failed to deactivate user');
        this.deactivatingUserId.set(null);
      },
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
