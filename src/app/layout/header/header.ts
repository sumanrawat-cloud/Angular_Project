import { Component, EventEmitter, Input, Output, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile, UserRole } from '../../core/auth/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { trigger, state, style, animate, transition } from '@angular/animations';

export interface VNotification {
  id: number;
  read: boolean;
}

const VIEW_ROLE_KEY = 'hdr_active_view_role';

/** Maps each login role to its dedicated profile page route */
const PROFILE_ROUTE_BY_ROLE: Record<string, string> = {
  EMPLOYEE:    '/employee/employee-profile',
  MANAGER:     '/manager/manager-profile',
  super_admin: '/super-admin/admin-profile',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
  animations: [
    trigger('panelAnimation', [
      state('void', style({ opacity: 0, transform: 'translateY(-12px) scale(0.96)' })),
      state('*',   style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      transition(':enter', animate('280ms cubic-bezier(0.34, 1.56, 0.64, 1)')),
      transition(':leave', animate('180ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
    trigger('itemAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(10px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('arrowRotate', [
      state('closed', style({ transform: 'rotate(0deg)' })),
      state('open',   style({ transform: 'rotate(180deg)' })),
      transition('closed <=> open', animate('250ms ease')),
    ])
  ]
})
export class HeaderComponent implements OnInit {

  /**
   * Sidebar open/closed state — owned and updated by MainLayoutComponent.
   * The header only reads this to know which icon state to show.
   */
  @Input() sidebarOpen = true;
  @Input() isMobile     = false;

  @Output() toggleSidebar = new EventEmitter<void>();

  userProfile!: UserProfile;

  showRoleSwitcher = false;
  activeViewRole: 'MANAGER' | 'EMPLOYEE' = 'MANAGER';

  constructor(
    private auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.userProfile = this.auth.getProfile();

    const loginRole: UserRole | null = this.auth.getRole();
    this.showRoleSwitcher = loginRole === 'MANAGER';

    if (this.showRoleSwitcher) {
      const saved = localStorage.getItem(VIEW_ROLE_KEY) as 'MANAGER' | 'EMPLOYEE' | null;
      this.activeViewRole = saved ?? 'MANAGER';
    }
  }

  /** Navigates to the profile page that matches the logged-in user's role. */
  navigateToProfile(): void {
    const role = this.auth.getRole();          // e.g. 'EMPLOYEE' | 'MANAGER' | 'super_admin'
    const route = role ? (PROFILE_ROUTE_BY_ROLE[role] ?? '/') : '/';
    this.profileOpen = false;
    this.router.navigate([route]);
  }

  switchRole(role: 'MANAGER' | 'EMPLOYEE'): void {
    if (this.activeViewRole === role) return;
    this.activeViewRole = role;
    localStorage.setItem(VIEW_ROLE_KEY, role);
    const route = role === 'MANAGER' ? '/manager' : '/employee';
    const label = role === 'MANAGER' ? 'Manager Panel' : 'Employee Panel';
    this.router.navigate([route]).then(() => {
      this.snackBar.open(`Switched to ${label}`, undefined, {
        duration: 2500,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      });
    });
  }

  logout(): void {
    localStorage.removeItem(VIEW_ROLE_KEY);
    this.auth.logout();
  }

  notifOpen   = false;
  profileOpen = false;

  notifications: VNotification[] = [
    { id: 1, read: false },
    { id: 2, read: false },
    { id: 3, read: true  },
    { id: 4, read: true  }
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  toggleNotif(): void {
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) this.profileOpen = false;
  }

  toggleProfile(): void {
    this.profileOpen = !this.profileOpen;
    if (this.profileOpen) this.notifOpen = false;
  }

  closeAll(): void {
    this.notifOpen   = false;
    this.profileOpen = false;
  }

  markAllRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAll();
  }
}