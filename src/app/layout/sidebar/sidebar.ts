import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService, UserRole } from '../../core/auth/auth.service';

export interface SubMenuItem {
  label: string;
  link:  string;
}

export interface MenuItem {
  label:       string;
  icon:        string;
  badge?:      string;
  link?:       string;
  hasChildren: boolean;
  expanded?:   boolean;
  disabled?:   boolean;   // true = route not yet implemented, clicking does nothing
  children?:   SubMenuItem[];
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const EMPLOYEE_MENU: MenuGroup[] = [
  {
    title: 'MENU',
    items: [
      {
        label:       'Submit DSR',
        icon:        'assignment_turned_in',
        hasChildren: false,
        link:        '/employee',
      },
      // {
      //   label:       'My Profile',
      //   icon:        'person_outline',
      //   hasChildren: false,
      //   link:        '/employee/profile',
      //   disabled:    true,
      // },
    ]
  },
  {
    title: 'MY WORK',
    items: [
      {
        label:       'My Timesheet',
        icon:        'edit_calendar',
        hasChildren: false,
        link:        '/employee/my-timesheet',
      },
      // {
      //   label:       'My Risks',
      //   icon:        'warning_amber',
      //   hasChildren: false,
      //   link:        '/employee/risks',
      //   disabled:    true,
      // },

    ]
  },
  // {
  //   title: 'SUPPORT',
  //   items: [
  //     {
  //       label:       'Help & Docs',
  //       icon:        'help_outline',
  //       hasChildren: false,
  //       link:        '/employee/help',
  //       disabled:    true,
  //     },
  //   ]
  // },
];

// ─── Manager menu (no Submit DSR) ────────────────────────────────────────────
const MANAGER_MENU: MenuGroup[] = [
  {
    title: 'MENU',
    items: [
      {
        label:       'Dashboard',
        icon:        'speed',
        hasChildren: false,
        link:        '/manager',
      },

    ]
  },
  // {
  //   title: 'MY WORK',
  //   items: [
  //     {
  //       label:       'My Timesheet',
  //       icon:        'edit_calendar',
  //       hasChildren: false,
  //       link:        '/manager/timesheet',
  //       disabled:    true,
  //     },
  //     {
  //       label:       'My Risks',
  //       icon:        'warning_amber',
  //       hasChildren: false,
  //       link:        '/manager/risks',
  //       disabled:    true,
  //     },
  //     {
  //       label:       'History',
  //       icon:        'history',
  //       hasChildren: false,
  //       link:        '/manager/history',
  //       disabled:    true,
  //     },
  //   ]
  // },
  // {
  //   title: 'SUPPORT',
  //   items: [
  //     {
  //       label:       'Help & Docs',
  //       icon:        'help_outline',
  //       hasChildren: false,
  //       link:        '/manager/help',
  //       disabled:    true,
  //     },
  //   ]
  // },
];

// ─── Super Admin menu ─────────────────────────────────────────────────────────
const SUPER_ADMIN_MENU: MenuGroup[] = [
  {
    title: 'MENU',
    items: [
      {
        label:       'Dashboard',
        icon:        'speed',
        hasChildren: false,
        link:        '/super-admin',
      },

    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      // {
      //   label:       'Users',
      //   icon:        'manage_accounts',
      //   hasChildren: false,
      //   link:        '/super-admin/users',
      //   disabled:    true,
      // },
      // {
      //   label:       'report',
      //   icon:        'bar_chart',
      //   hasChildren: false,
      //   link:        '/super-admin/report',
      // //  disabled:    false,
      // },
{
        // FIX: label was 'report' (lowercase), link was '/super-admin/report' ✓ (already correct)
        label:       'Reports',
        icon:        'bar_chart',
        hasChildren: false,
        link:        '/super-admin/report',
      },
    ]
  },
      
  
  // {
  //   title: 'SUPPORT',
  //   items: [
  //     {
  //       label:       'Help & Docs',
  //       icon:        'help_outline',
  //       hasChildren: false,
  //       link:        '/super-admin/help',
  //       disabled:    true,
  //     },
  //   ]
  // },
];

// ─── Role → menu map ──────────────────────────────────────────────────────────
const MENU_BY_ROLE: Record<UserRole, MenuGroup[]> = {
  EMPLOYEE:    EMPLOYEE_MENU,
  MANAGER:     MANAGER_MENU,
  super_admin: SUPER_ADMIN_MENU,
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit {
  @Input() sidebarOpen = false;
  @Input() isMobile     = false;
  @Output() closeSidebar = new EventEmitter<void>();

  menuGroups: MenuGroup[] = [];

  constructor(
    public router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.menuGroups = role ? (MENU_BY_ROLE[role] ?? []) : [];
  }

  toggleItem(item: MenuItem): void {
    if (item.disabled) return;   // route not yet implemented — stay on current page
    if (!item.hasChildren) {
      if (item.link) this.router.navigate([item.link]);
      return;
    }
    item.expanded = !item.expanded;
  }

  navigateTo(link: string): void {
    this.router.navigate([link]);
  }

  isActive(link?: string): boolean {
    if (!link) return false;
    return this.router.url === link || this.router.url === link + '/';
  }
}