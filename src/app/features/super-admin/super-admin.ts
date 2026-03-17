import {
  Component, OnInit, AfterViewInit,
  ChangeDetectorRef, ViewChild, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule }                    from '@angular/material/button';
import { MatIconModule }                      from '@angular/material/icon';
import { MatTooltipModule }                   from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule }     from '@angular/material/snack-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule }             from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule }   from '@angular/material/paginator';
import { MatInputModule }                     from '@angular/material/input';
import { MatFormFieldModule }                 from '@angular/material/form-field';
import { MatSelectModule }                    from '@angular/material/select';
import { MatDividerModule }                   from '@angular/material/divider';

import { AuthService } from '../../core/auth/auth.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface OrgUser {
  id:             string;
  name:           string;
  initials:       string;
  avatarColor:    string;
  email:          string;
  role:           'EMPLOYEE' | 'MANAGER';
  department:     string;
  status:         'active' | 'inactive';
  joinedDate:     string;
  lastActive:     string;
  timesheetsThisMonth: number;
}

export interface OrgRisk {
  id:                 string;
  reportedBy:         string;
  department:         string;
  text:               string;
  impact:             'low' | 'medium' | 'high';
  date:               string;
  escalationRequired: boolean;
}

export interface DepartmentStat {
  name:         string;
  icon:         string;
  color:        string;
  bgColor:      string;
  totalMembers: number;
  activeToday:  number;
  avgUtil:      number;
  pendingDsrs:  number;
}


@Component({
  selector: 'app-super-admin',
  standalone:    true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDividerModule,
  ],
  templateUrl: './super-admin.html',
  styleUrl: './super-admin.css',
})
export class SuperAdmin implements OnInit, AfterViewInit {

  @ViewChild(MatSort)      sort!:      MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  adminName = 'Super Admin';

  dataSource = new MatTableDataSource<OrgUser>([]);

  searchText   = '';
  filterRole   = '';
  filterStatus = '';
  filterDept   = '';

  userTableColumns: string[] = [
    'user', 'email', 'department', 'status', 'lastActive', 'timesheets',
  ];

  orgUsers:        OrgUser[]        = [];
  orgRisks:        OrgRisk[]        = [];
  departmentStats: DepartmentStat[] = [];

  orgStats = {
    totalUsers:       0,
    activeToday:      0,
    totalManagers:    0,
    totalEmployees:   0,
    pendingDsrs:      0,
    openRisks:        0,
    highRisks:        0,
    avgUtilization:   0,
  };

  constructor(
    private authService: AuthService,
    private cdr:         ChangeDetectorRef,
    private snackbar:    MatSnackBar,
    private router:      Router,
  ) {}

  ngOnInit(): void {
    const profile   = this.authService.getProfile();
    this.adminName  = profile.name;
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort      = this.sort;
    this.dataSource.paginator = this.paginator;
 this.paginator.pageSize = 5;
    this.dataSource.sortingDataAccessor = (user, col) => {
      switch (col) {
        case 'user':       return user.name.toLowerCase();
        case 'email':      return user.email.toLowerCase();
        case 'role':       return user.role.toLowerCase();
        case 'department': return user.department.toLowerCase();
        case 'status':     return user.status;
        case 'lastActive': return user.lastActive;
        case 'timesheets': return user.timesheetsThisMonth;
        default:           return '';
      }
    };

    this.dataSource.filterPredicate = (user: OrgUser, filter: string) => {
      const f = JSON.parse(filter);
      const textMatch = !f.text ||
        user.name.toLowerCase().includes(f.text)  ||
        user.email.toLowerCase().includes(f.text) ||
        user.department.toLowerCase().includes(f.text);
      const roleMatch   = !f.role   || user.role === f.role;
      const statusMatch = !f.status || user.status === f.status;
      const deptMatch   = !f.dept   || user.department === f.dept;
      return textMatch && roleMatch && statusMatch && deptMatch;
    };

    this.cdr.detectChanges();
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      text:   this.searchText.trim().toLowerCase(),
      role:   this.filterRole,
      status: this.filterStatus,
      dept:   this.filterDept,
    });
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.searchText   = '';
    this.filterRole   = '';
    this.filterStatus = '';
    this.filterDept   = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterRole || this.filterStatus || this.filterDept);
  }

  get filteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  get uniqueDepartments(): string[] {
    return [...new Set(this.orgUsers.map(u => u.department))].sort();
  }

  // ── Load / seed data ──────────────────────────────────────────────────────
  loadData(): void {
    this.orgUsers = [
      {
        id: 'u1', name: 'Bharat Kumar',   initials: 'BK', avatarColor: '#405189',
        email: 'bharat.kumar@company.com',     role: 'EMPLOYEE', department: 'Engineering',
        status: 'active',   joinedDate: 'Jan 2023', lastActive: 'Today',   timesheetsThisMonth: 18,
      },
      {
        id: 'u2', name: 'Gaurav Uttam',   initials: 'GU', avatarColor: '#0ab39c',
        email: 'gaurav.uttam@company.com',     role: 'MANAGER',  department: 'Engineering',
        status: 'active',   joinedDate: 'Mar 2022', lastActive: 'Today',   timesheetsThisMonth: 20,
      },
      {
        id: 'u3', name: 'Sumit Verma',     initials: 'SV', avatarColor: '#f06548',
        email: 'Sumit.verma@company.com',       role: 'EMPLOYEE', department: 'QA',
        status: 'active',   joinedDate: 'Jun 2022', lastActive: 'Today',   timesheetsThisMonth: 16,
      },
      {
        id: 'u4', name: 'Ankit Sharma',   initials: 'AS', avatarColor: '#f7b731',
        email: 'ankit.sharma@company.com',     role: 'EMPLOYEE', department: 'Engineering',
        status: 'active',   joinedDate: 'Sep 2022', lastActive: 'Yesterday', timesheetsThisMonth: 12,
      },
      {
        id: 'u5', name: 'Kuldeep Singh',  initials: 'KS', avatarColor: '#8854d0',
        email: 'kuldeep.singh@company.com',    role: 'EMPLOYEE', department: 'Design',
        status: 'inactive', joinedDate: 'Feb 2023', lastActive: '3 days ago', timesheetsThisMonth: 4,
      },
      {
        id: 'u6', name: 'Priya Nair',     initials: 'PN', avatarColor: '#e91e8c',
        email: 'priya.nair@company.com',       role: 'EMPLOYEE', department: 'Design',
        status: 'active',   joinedDate: 'Apr 2023', lastActive: 'Today',   timesheetsThisMonth: 19,
      },
      {
        id: 'u7', name: 'Rahul Mehta',    initials: 'RM', avatarColor: '#1565c0',
        email: 'rahul.mehta@company.com',      role: 'EMPLOYEE', department: 'QA',
        status: 'active',   joinedDate: 'Jul 2022', lastActive: 'Today',   timesheetsThisMonth: 15,
      },
      {
        id: 'u8', name: 'Divya Krishnan', initials: 'DK', avatarColor: '#00695c',
        email: 'divya.krishnan@company.com',   role: 'EMPLOYEE', department: 'Engineering',
        status: 'active',   joinedDate: 'Nov 2021', lastActive: 'Today',   timesheetsThisMonth: 20,
      },
      {
        id: 'u9', name: 'Saurabh Joshi',  initials: 'SJ', avatarColor: '#e65100',
        email: 'saurabh.joshi@company.com',    role: 'EMPLOYEE', department: 'Engineering',
        status: 'active',   joinedDate: 'Aug 2023', lastActive: 'Yesterday', timesheetsThisMonth: 10,
      },
      {
        id: 'u10', name: 'Neha Gupta',    initials: 'NG', avatarColor: '#6a1b9a',
        email: 'neha.gupta@company.com',       role: 'EMPLOYEE', department: 'Design',
        status: 'inactive', joinedDate: 'Oct 2022', lastActive: '5 days ago', timesheetsThisMonth: 2,
      },
      {
        id: 'u11', name: 'Arjun Pillai',  initials: 'AP', avatarColor: '#2e7d32',
        email: 'arjun.pillai@company.com',     role: 'EMPLOYEE', department: 'QA',
        status: 'active',   joinedDate: 'Dec 2022', lastActive: 'Today',   timesheetsThisMonth: 17,
      },
      {
        id: 'u12', name: 'Meera Iyer',    initials: 'MI', avatarColor: '#c62828',
        email: 'meera.iyer@company.com',       role: 'MANAGER',  department: 'Design',
        status: 'active',   joinedDate: 'Jan 2022', lastActive: 'Today',   timesheetsThisMonth: 20,
      },
    ];

    this.dataSource.data = this.orgUsers;

    this.orgRisks = [
      {
        id: 'or1', reportedBy: 'Bharat Kumar',   department: 'Engineering',
        text: 'API endpoints blocked — critical integration at risk',
        impact: 'high', date: 'Mar 5', escalationRequired: true,
      },
      {
        id: 'or2', reportedBy: 'Ankit Sharma',   department: 'Engineering',
        text: 'Client design approval delayed since Monday',
        impact: 'medium', date: 'Mar 4', escalationRequired: false,
      },
      {
        id: 'or3', reportedBy: 'Sumit Verma',     department: 'QA',
        text: 'Test environment unstable — intermittent failures blocking release',
        impact: 'high', date: 'Mar 5', escalationRequired: true,
      },
      {
        id: 'or4', reportedBy: 'Priya Nair',     department: 'Design',
        text: 'Design system assets pending brand team sign-off',
        impact: 'low', date: 'Mar 3', escalationRequired: false,
      },
    ];

    this.departmentStats = [
      {
        name: 'Engineering', icon: 'code',          color: '#405189', bgColor: '#eaecf5',
        totalMembers: 5, activeToday: 4, avgUtil: 77, pendingDsrs: 3,
      },
      {
        name: 'QA',          icon: 'bug_report',    color: '#0ab39c', bgColor: '#e8f8f5',
        totalMembers: 3, activeToday: 3, avgUtil: 84, pendingDsrs: 1,
      },
      {
        name: 'Design',      icon: 'palette',       color: '#f06548', bgColor: '#fef3ee',
        totalMembers: 4, activeToday: 2, avgUtil: 55, pendingDsrs: 2,
      },
    ];

    this.computeStats();
  }

  computeStats(): void {
    const total          = this.orgUsers.length;
    const activeToday    = this.orgUsers.filter(u => u.status === 'active' && u.lastActive === 'Today').length;
    const totalManagers  = this.orgUsers.filter(u => u.role === 'MANAGER').length;
    const totalEmployees = this.orgUsers.filter(u => u.role === 'EMPLOYEE').length;
    const pendingDsrs    = this.departmentStats.reduce((s, d) => s + d.pendingDsrs, 0);
    const openRisks      = this.orgRisks.length;
    const highRisks      = this.orgRisks.filter(r => r.impact === 'high').length;
    const avgUtilization = this.departmentStats.length
      ? Math.round(this.departmentStats.reduce((s, d) => s + d.avgUtil, 0) / this.departmentStats.length)
      : 0;
    this.orgStats = { totalUsers: total, activeToday, totalManagers, totalEmployees, pendingDsrs, openRisks, highRisks, avgUtilization };
  }

  // ── Status helpers ────────────────────────────────────────────────────────
  getRoleClass(role: string): string {
    return role === 'MANAGER' ? 'sa-role--manager' : 'sa-role--employee';
  }

  getRoleLabel(role: string): string {
    return role === 'MANAGER' ? 'Manager' : 'Employee';
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'sa-status--active' : 'sa-status--inactive';
  }

  getImpactClass(impact: string): string {
    if (impact === 'high')   return 'sa-impact--high';
    if (impact === 'medium') return 'sa-impact--medium';
    return 'sa-impact--low';
  }

  getImpactIcon(impact: string): string {
    if (impact === 'high')   return 'error';
    if (impact === 'medium') return 'warning';
    return 'info';
  }

  getUtilBarClass(util: number): string {
    if (util >= 80) return 'sa-util-bar--high';
    if (util >= 50) return 'sa-util-bar--mid';
    return 'sa-util-bar--low';
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  exportReport(): void {
    this.snackbar.open('📊 Report export started...', 'Close', { duration: 2500 });
  }

  toggleUserStatus(user: OrgUser): void {
    user.status = user.status === 'active' ? 'inactive' : 'active';
    this.dataSource.data = [...this.orgUsers];
    this.computeStats();
    this.cdr.detectChanges();
    const msg = user.status === 'active'
      ? `✅ ${user.name} activated`
      : `⛔ ${user.name} deactivated`;
    this.snackbar.open(msg, 'Close', { duration: 2500 });
  }

  // ── Computed getters ──────────────────────────────────────────────────────
  get totalHighRisks(): number {
    return this.orgRisks.filter(r => r.impact === 'high').length;
  }
}