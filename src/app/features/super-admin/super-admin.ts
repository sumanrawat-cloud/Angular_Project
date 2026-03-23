import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ChangeDetectorRef, ViewChild, ViewEncapsulation,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule, TitleCasePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { MatButtonModule }                    from '@angular/material/button';
import { MatDividerModule }                   from '@angular/material/divider';
import { MatFormFieldModule }                 from '@angular/material/form-field';
import { MatIconModule }                      from '@angular/material/icon';
import { MatInputModule }                     from '@angular/material/input';
import { MatPaginator, MatPaginatorModule }   from '@angular/material/paginator';
import { MatProgressBarModule }               from '@angular/material/progress-bar';
import { MatSelectModule }                    from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule }     from '@angular/material/snack-bar';
import { MatSort, MatSortModule }             from '@angular/material/sort';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule }                   from '@angular/material/tooltip';

import { AuthService } from '../../core/auth/auth.service';

// ── Interfaces ────────────────────────────────────────────────────

export interface OrgUser {
  id:                  string;
  name:                string;
  initials:            string;
  avatarColor:         string;
  email:               string;
  role:                'EMPLOYEE' | 'MANAGER';
  department:          string;
  status:              'active' | 'inactive';
  joinedDate:          string;
  lastActive:          string;
  timesheetsThisMonth: number;
  client:              string;
  project:             string;
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

export interface OrgStats {
  totalUsers:     number;
  activeToday:    number;
  totalManagers:  number;
  totalEmployees: number;
  pendingDsrs:    number;
  openRisks:      number;
  highRisks:      number;
  avgUtilization: number;
}

// ── Component ─────────────────────────────────────────────────────

@Component({
  selector:      'app-super-admin',
  standalone:    true,
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('pageEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate('380ms cubic-bezier(.22,.61,.36,1)',
          style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
  imports: [
    CommonModule,
    FormsModule,
    TitleCasePipe,
    SlicePipe,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './super-admin.html',
  styleUrl:    './super-admin.css',
})
export class SuperAdmin implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatSort)      sort!:      MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ── State ────────────────────────────────────────────────────────
  adminName = 'Super Admin';

  dataSource = new MatTableDataSource<OrgUser>([]);

  searchText   = '';
  filterRole   = '';
  filterStatus = '';
  filterDept   = '';

  /** Controls how many rows are visible in Employee Assignments panel */
  assignmentScrollIndex = 4;

  private routerSub?: Subscription;

  readonly userTableColumns: string[] = [
    'user', 'email', 'department', 'status', 'lastActive', 'timesheets',
  ];

  orgUsers:        OrgUser[]        = [];
  orgRisks:        OrgRisk[]        = [];
  departmentStats: DepartmentStat[] = [];

  orgStats: OrgStats = {
    totalUsers:     0,
    activeToday:    0,
    totalManagers:  0,
    totalEmployees: 0,
    pendingDsrs:    0,
    openRisks:      0,
    highRisks:      0,
    avgUtilization: 0,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly cdr:         ChangeDetectorRef,
    private readonly snackbar:    MatSnackBar,
    private readonly router:      Router,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    try {
      const profile  = this.authService.getProfile();
      this.adminName = profile?.name ?? 'Super Admin';
    } catch { /* guard if AuthService not available in test */ }

    this.loadData();

    // Re-load and re-render data every time this route becomes active.
    // This fires on first load AND on every back-navigation return — it is
    // the only reliable way to refresh the table when Angular reuses the
    // component instance instead of destroying and recreating it.
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (e.urlAfterRedirects.startsWith('/super-admin') &&
            !e.urlAfterRedirects.includes('super-admin-detail')) {
          this.loadData();
          this.dataSource.data = this.orgUsers.filter(u => u.status === 'active');
          this.applyFilters();
          this.cdr.detectChanges();
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.paginator.pageSize = 5;

    // ✅ FIX: Wire sort/paginator into the EXISTING dataSource that was
    // already populated in loadData(). The original code created a new
    // MatTableDataSource and reassigned this.dataSource — but mat-table
    // had already called connect() on the original empty instance, so it
    // was subscribed to the wrong stream and showed a blank table on every
    // back-navigation. Never reassign this.dataSource after mat-table renders.
    this.dataSource.sortingDataAccessor = (user: OrgUser, col: string): string | number => {
      switch (col) {
        case 'user':       return user.name.toLowerCase();
        case 'email':      return user.email.toLowerCase();
        case 'department': return user.department.toLowerCase();
        case 'status':     return user.status;
        case 'lastActive': return user.lastActive;
        case 'timesheets': return user.timesheetsThisMonth;
        default:           return '';
      }
    };

    this.dataSource.filterPredicate = (user: OrgUser, filter: string): boolean => {
      if (!filter) return true;
      let f: { text: string; role: string; status: string; dept: string };
      try { f = JSON.parse(filter); } catch { return true; }
      const textMatch = !f.text
        || user.name.toLowerCase().includes(f.text)
        || user.email.toLowerCase().includes(f.text)
        || user.department.toLowerCase().includes(f.text);
      return textMatch
        && (!f.role   || user.role        === f.role)
        && (!f.status || user.status      === f.status)
        && (!f.dept   || user.department  === f.dept);
    };

    this.dataSource.sort      = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.data      = this.orgUsers.filter(u => u.status === 'active');

    // Initialize filter with valid JSON so filterPredicate never receives ''
    this.applyFilters();

    this.paginator.page.subscribe(() => this.cdr.detectChanges());
    this.cdr.detectChanges();
  }

  // ── Filters ──────────────────────────────────────────────────────
  applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      text:   this.searchText.trim().toLowerCase(),
      role:   this.filterRole,
      status: this.filterStatus,
      dept:   this.filterDept,
    });
    this.dataSource.paginator?.firstPage();
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.searchText = this.filterRole = this.filterStatus = this.filterDept = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterRole || this.filterStatus || this.filterDept);
  }

  get filteredCount(): number { return this.dataSource.filteredData.length; }

  get uniqueDepartments(): string[] {
    return [...new Set(this.orgUsers.map(u => u.department))].sort();
  }

  /** "Showing X–Y of Z" label values */
  get showingFrom(): number {
    if (!this.paginator) return 1;
    return this.paginator.pageIndex * this.paginator.pageSize + 1;
  }

  get showingTo(): number {
    if (!this.paginator) return 0;
    const total = this.hasActiveFilters ? this.filteredCount : this.dataSource.data.length;
    return Math.min((this.paginator.pageIndex + 1) * this.paginator.pageSize, total);
  }

  // ── Data ─────────────────────────────────────────────────────────
  loadData(): void {
    this.orgUsers = [
      { id:'u1',  name:'Bharat Kumar',   initials:'BK', avatarColor:'#405189',
        email:'bharat.kumar@company.com',   role:'EMPLOYEE', department:'Engineering',
        status:'active',   joinedDate:'Jan 2023', lastActive:'Today',      timesheetsThisMonth:18,
        client:'Acme Corp', project:'API Gateway' },
      { id:'u2',  name:'Gaurav Uttam',   initials:'GU', avatarColor:'#0ab39c',
        email:'gaurav.uttam@company.com',   role:'MANAGER',  department:'Engineering',
        status:'active',   joinedDate:'Mar 2022', lastActive:'Today',      timesheetsThisMonth:20,
        client:'TechNova', project:'Cloud Migration' },
      { id:'u3',  name:'Sumit Verma',    initials:'SV', avatarColor:'#f06548',
        email:'sumit.verma@company.com',    role:'EMPLOYEE', department:'QA',
        status:'active',   joinedDate:'Jun 2022', lastActive:'Today',      timesheetsThisMonth:16,
        client:'FinEdge', project:'QA Automation' },
      { id:'u4',  name:'Ankit Sharma',   initials:'AS', avatarColor:'#f7b731',
        email:'ankit.sharma@company.com',   role:'EMPLOYEE', department:'Engineering',
        status:'active',   joinedDate:'Sep 2022', lastActive:'Yesterday',  timesheetsThisMonth:12,
        client:'Acme Corp', project:'API Gateway' },
      { id:'u5',  name:'Kuldeep Singh',  initials:'KS', avatarColor:'#8854d0',
        email:'kuldeep.singh@company.com',  role:'EMPLOYEE', department:'Design',
        status:'inactive', joinedDate:'Feb 2023', lastActive:'3 days ago', timesheetsThisMonth:4,
        client:'RetailX', project:'Brand Revamp' },
      { id:'u6',  name:'Priya Nair',     initials:'PN', avatarColor:'#e91e8c',
        email:'priya.nair@company.com',     role:'EMPLOYEE', department:'Design',
        status:'active',   joinedDate:'Apr 2023', lastActive:'Today',      timesheetsThisMonth:19,
        client:'RetailX', project:'Brand Revamp' },
      { id:'u7',  name:'Rahul Mehta',    initials:'RM', avatarColor:'#1565c0',
        email:'rahul.mehta@company.com',    role:'EMPLOYEE', department:'QA',
        status:'active',   joinedDate:'Jul 2022', lastActive:'Today',      timesheetsThisMonth:15,
        client:'FinEdge', project:'QA Automation' },
      { id:'u8',  name:'Divya Krishnan', initials:'DK', avatarColor:'#00695c',
        email:'divya.krishnan@company.com', role:'EMPLOYEE', department:'Engineering',
        status:'active',   joinedDate:'Nov 2021', lastActive:'Today',      timesheetsThisMonth:20,
        client:'TechNova', project:'Cloud Migration' },
      { id:'u9',  name:'Saurabh Joshi',  initials:'SJ', avatarColor:'#e65100',
        email:'saurabh.joshi@company.com',  role:'EMPLOYEE', department:'Engineering',
        status:'active',   joinedDate:'Aug 2023', lastActive:'Yesterday',  timesheetsThisMonth:10,
        client:'Acme Corp', project:'Dashboard Rebuild' },
      { id:'u10', name:'Neha Gupta',     initials:'NG', avatarColor:'#6a1b9a',
        email:'neha.gupta@company.com',     role:'EMPLOYEE', department:'Design',
        status:'inactive', joinedDate:'Oct 2022', lastActive:'5 days ago', timesheetsThisMonth:2,
        client:'RetailX', project:'Brand Revamp' },
      { id:'u11', name:'Arjun Pillai',   initials:'AP', avatarColor:'#2e7d32',
        email:'arjun.pillai@company.com',   role:'EMPLOYEE', department:'QA',
        status:'active',   joinedDate:'Dec 2022', lastActive:'Today',      timesheetsThisMonth:17,
        client:'FinEdge', project:'Security Audit' },
      { id:'u12', name:'Meera Iyer',     initials:'MI', avatarColor:'#c62828',
        email:'meera.iyer@company.com',     role:'MANAGER',  department:'Design',
        status:'active',   joinedDate:'Jan 2022', lastActive:'Today',      timesheetsThisMonth:20,
        client:'RetailX', project:'Brand Revamp' },
    ];

    this.orgRisks = [
      { id:'or1', reportedBy:'Bharat Kumar', department:'Engineering',
        text:'API endpoints blocked — critical integration at risk',
        impact:'high', date:'Mar 5', escalationRequired:true },
      { id:'or2', reportedBy:'Ankit Sharma', department:'Engineering',
        text:'Client design approval delayed since Monday',
        impact:'medium', date:'Mar 4', escalationRequired:false },
      { id:'or3', reportedBy:'Sumit Verma',  department:'QA',
        text:'Test environment unstable — intermittent failures blocking release',
        impact:'high', date:'Mar 5', escalationRequired:true },
      { id:'or4', reportedBy:'Priya Nair',   department:'Design',
        text:'Design system assets pending brand team sign-off',
        impact:'low', date:'Mar 3', escalationRequired:false },
    ];

    this.departmentStats = [
      { name:'Engineering', icon:'code',       color:'#405189', bgColor:'#eaecf5',
        totalMembers:5, activeToday:4, avgUtil:77, pendingDsrs:3 },
      { name:'QA',          icon:'bug_report', color:'#0ab39c', bgColor:'#e8f8f5',
        totalMembers:3, activeToday:3, avgUtil:84, pendingDsrs:1 },
      { name:'Design',      icon:'palette',    color:'#f06548', bgColor:'#fef3ee',
        totalMembers:4, activeToday:2, avgUtil:55, pendingDsrs:2 },
    ];

    this.computeStats();
  }

  computeStats(): void {
    this.orgStats = {
      totalUsers:     this.orgUsers.length,
      activeToday:    this.orgUsers.filter(u => u.status === 'active' && u.lastActive === 'Today').length,
      totalManagers:  this.orgUsers.filter(u => u.role === 'MANAGER').length,
      totalEmployees: this.orgUsers.filter(u => u.role === 'EMPLOYEE').length,
      pendingDsrs:    this.departmentStats.reduce((s, d) => s + d.pendingDsrs, 0),
      openRisks:      this.orgRisks.length,
      highRisks:      this.orgRisks.filter(r => r.impact === 'high').length,
      avgUtilization: this.departmentStats.length
        ? Math.round(this.departmentStats.reduce((s, d) => s + d.avgUtil, 0) / this.departmentStats.length)
        : 0,
    };
  }

  // ── Employee Assignments helpers ──────────────────────────────────
  getUserClient(user: OrgUser): string  { return user.client  ?? '—'; }
  getUserProject(user: OrgUser): string { return user.project ?? '—'; }

  // ── CSS class helpers ─────────────────────────────────────────────
  getRoleClass(role: string): string  { return role === 'MANAGER' ? 'sa-role--manager' : 'sa-role--employee'; }
  getRoleLabel(role: string): string  { return role === 'MANAGER' ? 'Manager' : 'Employee'; }
  getStatusClass(s: string): string   { return s === 'active' ? 'sa-status--active' : 'sa-status--inactive'; }
  getImpactClass(i: string): string   { return i === 'high' ? 'sa-impact--high' : i === 'medium' ? 'sa-impact--medium' : 'sa-impact--low'; }
  getImpactIcon(i: string): string    { return i === 'high' ? 'error' : i === 'medium' ? 'warning' : 'info'; }
  getUtilBarClass(u: number): string  { return u >= 80 ? 'sa-util-bar--high' : u >= 55 ? 'sa-util-bar--mid' : 'sa-util-bar--low'; }

  // ── Actions ──────────────────────────────────────────────────────
  exportReport(): void {
    this.snackbar.open('Report export started…', 'Close', { duration: 2500 });
  }



  /** Navigate to detail page, optionally pre-filtering by userId */
  goToDetailPage(user?: OrgUser): void {
    const queryParams: Record<string, string> = user ? { userId: user.id } : {};
    this.router.navigate(['/super-admin/super-admin-detail'], { queryParams });
  }

  /** Navigate to detail page pre-filtered by department (Dept Overview row click) */
  goToDeptDetail(dept: DepartmentStat): void {
    this.router.navigate(['/super-admin/super-admin-detail'], {
      queryParams: { dept: dept.name },
    });
  }

  /** Navigate to detail page pre-filtered by risk reporter (Risk Overview row click) */
  goToRiskDetail(risk: OrgRisk): void {
    this.router.navigate(['/super-admin/super-admin-detail'], {
      queryParams: {
        riskEmployee: risk.reportedBy,
        riskDept:     risk.department,
      },
    });
  }

}