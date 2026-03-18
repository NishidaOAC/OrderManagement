import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  role?: string;
};

type LoginResponse = {
  token?: string;
  accessToken?: string;
  jwt?: string;
  userId?: string | number;
  fullName?: string;
  userName?: string;
  user?: {
    id?: string | number;
    fullName?: string;
    name?: string;
  };
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenKey = 'auth_token';
  private readonly userIdKey = 'user_id';
  private readonly userNameKey = 'user_name';
  private readonly apiBase = 'http://localhost:5000/api';

  login(payload: LoginPayload): Observable<void> {
    return this.http.post<LoginResponse>(`${this.apiBase}/auth/login`, payload).pipe(
      tap((res) => {
        const token = res.token || res.accessToken || res.jwt || '';
        if (!token) {
          throw new Error('Token missing in login response');
        }
        this.setToken(token);

        const userIdFromResponse = res.userId ?? res.user?.id;
        const userId =
          userIdFromResponse !== undefined && userIdFromResponse !== null
            ? String(userIdFromResponse)
            : this.extractUserIdFromToken(token);

        if (userId) {
          this.setUserId(userId);
        }

        const userName = res.fullName || res.userName || res.user?.fullName || res.user?.name || '';
        if (userName) {
          this.setUserName(userName);
        }
      }),
      map(() => void 0)
    );
  }

  register(payload: RegisterPayload): Observable<void> {
    return this.http.post(`${this.apiBase}/auth/register`, payload).pipe(map(() => void 0));
  }

  logout(): void {
    this.removeToken();
    this.removeUserId();
    this.removeUserName();
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    return !this.isTokenExpired(token);
  }

  getUserId(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.userIdKey);
  }

  getUserName(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.userNameKey);
  }

  private setToken(token: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.tokenKey, token);
  }

  private setUserId(userId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.userIdKey, userId);
  }

  private setUserName(userName: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.userNameKey, userName);
  }

  private removeToken(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(this.tokenKey);
  }

  private removeUserId(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(this.userIdKey);
  }

  private removeUserName(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(this.userNameKey);
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }
      const payload = JSON.parse(atob(payloadPart)) as { sub?: string | number };
      if (payload.sub === undefined || payload.sub === null) {
        return null;
      }
      return String(payload.sub);
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return true;
      }
      const payload = JSON.parse(atob(payloadPart)) as { exp?: number };
      if (!payload.exp) {
        return true;
      }
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
