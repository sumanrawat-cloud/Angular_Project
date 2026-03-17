import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'super_admin';

// Profile shape consumed by HeaderComponent and other features (e.g. my-timesheet)
export interface UserProfile {
  id:        string;    // stable per-user id — e.g. 'emp_1', 'mgr_1', 'adm_1'
  name:      string;
  role:      string;    // display label e.g. "Employee"
  initials:  string;    // e.g. "BK"
  avatarUrl: string;    // ui-avatars URL — no local file dependency
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private roleKey = 'user_role';
  private nameKey = 'user_name';

  constructor(private router: Router) {}

  // ── Hardcoded credentials ──────────────────────────────────────────────
  private credentials: {
    [email: string]: { password: string; role: UserRole; name: string; id: string }
  } = {
    'emp@example.com':     { password: 'emp123',     role: 'EMPLOYEE',    name: 'Bharat Kumar', id: 'emp_1' },
    'manager@example.com': { password: 'manager123', role: 'MANAGER',     name: 'Gaurav Uttam', id: 'mgr_1' },
    'admin@example.com':   { password: 'admin123',   role: 'super_admin', name: 'Super Admin',  id: 'adm_1' }
  };

  // ── Role → display label ───────────────────────────────────────────────
  private roleLabels: Record<UserRole, string> = {
    'EMPLOYEE':    'Employee',
    'MANAGER':     'Manager',
    'super_admin': 'Super Admin'
  };

  // ── id key — stored alongside role so getProfile() can return it ───────
  private idKey = 'user_id';

  login(email: string, password: string): boolean {
    const user = this.credentials[email.toLowerCase()];
    if (!user || user.password !== password) return false;

    localStorage.setItem(this.roleKey, user.role);
    localStorage.setItem(this.nameKey, user.name);
    localStorage.setItem(this.idKey,   user.id);
    return true;
  }

  getRole(): UserRole | null {
    return localStorage.getItem(this.roleKey) as UserRole;
  }

  getName(): string {
    return localStorage.getItem(this.nameKey) ?? 'User';
  }

  getId(): string {
    return localStorage.getItem(this.idKey) ?? 'emp_1';
  }

  isLoggedIn(): boolean {
    return !!this.getRole();
  }

  // ── Profile object consumed by header, timesheet, etc. ────────────────
  getProfile(): UserProfile {
    const name  = this.getName();
    const role  = this.getRole();
    const id    = this.getId();
    const label = role ? this.roleLabels[role] : 'User';

    const initials = name
      .split(' ')
      .map(w => w[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const bgColor   = role === 'MANAGER' ? '0ab39c' : role === 'super_admin' ? 'f06548' : '405189';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&bold=true&size=128`;

    return { id, name, role: label, initials, avatarUrl };
  }

  logout() {
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.nameKey);
    localStorage.removeItem(this.idKey);
    this.router.navigate(['/login']);
  }
}