import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserListItem = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  getUsers(): Observable<{ users: UserListItem[] }> {
    return this.http.get<{ users: UserListItem[] }>(`${this.apiBase}/users`);
  }

  deactivateUser(id: number): Observable<void> {
    return this.http.delete(`${this.apiBase}/users/${id}`).pipe(map(() => void 0));
  }
}
