import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ChangeDetectorRef, ViewChild, ViewEncapsulation,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { animate, state, style, transition, trigger } from '@angular/animations';

import { MatButtonModule }                    from '@angular/material/button';
import { MatDividerModule }                   from '@angular/material/divider';
import { MatFormFieldModule }                 from '@angular/material/form-field';
import { MatIconModule }                      from '@angular/material/icon';
import { MatInputModule }                     from '@angular/material/input';
import { MatPaginator, MatPaginatorModule }   from '@angular/material/paginator';
import { MatSelectModule }                    from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule }     from '@angular/material/snack-bar';
import { MatSort, MatSortModule }             from '@angular/material/sort';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule }                   from '@angular/material/tooltip';

// ── Interfaces ────────────────────────────────────────────────────

export interface DsrEntry {
  id:           string;
  employeeName: string;
  initials:     string;
  avatarColor:  string;
  role:         'EMPLOYEE' | 'MANAGER';
  department:   string;
  client:       string;
  project:      string;
  task:         string;
  taskFull:     string;
  date:         string;
  hours:        number;
  dsrStatus:    'approved' | 'pending' | 'rejected';
}

export interface DsrStats  { approved: number; pending: number; rejected: number; totalHours: number; }
export interface ClientGroup { name: string; members: MemberRef[]; projects: ProjectGroup[]; }
export interface ProjectGroup { name: string; members: MemberRef[]; }
export interface MemberRef { name: string; initials: string; avatarColor: string; role: string; }

// ── Page-enter animation ──────────────────────────────────────────

const PAGE_ENTER = trigger('pageEnter', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(14px)' }),
    animate('380ms cubic-bezier(.22,.61,.36,1)',
      style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
]);

// ── Component ─────────────────────────────────────────────────────

@Component({
  selector:      'app-super-admin-detail',
  standalone:    true,
  encapsulation: ViewEncapsulation.None,
  animations: [
    PAGE_ENTER,
    trigger('expandDetail', [
      state('collapsed', style({ height: '0px', minHeight: '0', opacity: 0 })),
      state('expanded',  style({ height: '*', opacity: 1 })),
      transition('expanded <=> collapsed',
        animate('220ms cubic-bezier(0.4,0,0.2,1)')),
    ]),
  ],
  imports: [
    CommonModule, FormsModule, TitleCasePipe,
    MatButtonModule, MatDividerModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatPaginatorModule,
    MatSelectModule, MatSnackBarModule, MatSortModule,
    MatTableModule, MatTooltipModule,
  ],
  templateUrl: './super-admin-detail.html',
  styleUrl:    './super-admin-detail.css',
})
export class SuperAdminDetail implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('dsrSort')      dsrSort!:      MatSort;
  @ViewChild('dsrPaginator') dsrPaginator!: MatPaginator;

  // ── Filter state ─────────────────────────────────────────────────
  searchText     = '';
  filterEmployee = '';
  filterDept     = '';   // ← NEW: department filter (from dept card click)
  filterClient   = '';
  filterProject  = '';
  filterStatus   = '';

  /** Human-readable label shown in the context banner */
  activeContextLabel = '';

  /** Controls visibility of the top entry bar */
  isEntering = true;

  readonly dsrTableColumns: string[] = [
    'employee', 'client', 'project', 'task', 'date', 'hours', 'dsrStatus', 'expand',
  ];

  dsrEntries:   DsrEntry[]      = [];
  dsrDataSource = new MatTableDataSource<DsrEntry>([]);
  expandedRow:  DsrEntry | null = null;

  dsrStats: DsrStats = { approved: 0, pending: 0, rejected: 0, totalHours: 0 };

  private routerSub?: Subscription;
  private paramSub?:  Subscription;
  clientGroups: ClientGroup[] = [];

  constructor(
    private readonly router:   Router,
    private readonly route:    ActivatedRoute,
    private readonly cdr:      ChangeDetectorRef,
    private readonly snackbar: MatSnackBar,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────

  ngOnInit(): void {
    // 1. Load all data first.
    this.loadDsrData();
    this.computeStats();
    this.buildClientGroups();

    // 2. Subscribe to query params — store the sub so we can unsubscribe.
    this.paramSub = this.route.queryParams.subscribe(params => {
      this._handleQueryParams(params);
    });

    // 3. Hide entry bar after animation completes (380ms animation).
    setTimeout(() => { this.isEntering = false; this.cdr.detectChanges(); }, 400);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.paramSub?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.dsrDataSource.sortingDataAccessor = (row: DsrEntry, col: string): string | number => {
      switch (col) {
        case 'employee':  return row.employeeName.toLowerCase();
        case 'client':    return row.client.toLowerCase();
        case 'project':   return row.project.toLowerCase();
        case 'date':      return row.date;
        case 'hours':     return row.hours;
        case 'dsrStatus': return row.dsrStatus;
        default:          return '';
      }
    };

    this.dsrDataSource.filterPredicate = (row: DsrEntry, filter: string): boolean => {
      if (!filter) return true;
      let f: { text: string; employee: string; dept: string; client: string; project: string; status: string };
      try { f = JSON.parse(filter); } catch { return true; }

      const textMatch = !f.text
        || row.employeeName.toLowerCase().includes(f.text)
        || row.project.toLowerCase().includes(f.text)
        || row.task.toLowerCase().includes(f.text)
        || row.client.toLowerCase().includes(f.text)
        || row.department.toLowerCase().includes(f.text);

      return textMatch
        && (!f.employee || row.employeeName === f.employee)
        && (!f.dept     || row.department   === f.dept)
        && (!f.client   || row.client       === f.client)
        && (!f.project  || row.project      === f.project)
        && (!f.status   || row.dsrStatus    === f.status);
    };

    this.dsrDataSource.sort      = this.dsrSort;
    this.dsrDataSource.paginator = this.dsrPaginator;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  // ── Query param handler ───────────────────────────────────────────

  /**
   * Handles all incoming query params from the dashboard.
   *
   * Supported params:
   *   userId        → pre-filter by employee name
   *   dept          → pre-filter by department (from dept card click)
   *   riskEmployee  → pre-filter by employee who reported the risk
   *   riskDept      → (optional companion to riskEmployee)
   */
  private _handleQueryParams(params: Record<string, string>): void {
    // Reset all context filters first
    this.filterEmployee = '';
    this.filterDept     = '';
    this.filterClient   = '';
    this.filterProject  = '';
    this.filterStatus   = '';
    this.activeContextLabel = '';

    if (params['userId']) {
      // Employee Assignments panel click — filter by specific user
      const nameMap: Record<string, string> = {
        u1:'Bharat Kumar',   u2:'Gaurav Uttam',   u3:'Sumit Verma',
        u4:'Ankit Sharma',   u5:'Kuldeep Singh',  u6:'Priya Nair',
        u7:'Rahul Mehta',    u8:'Divya Krishnan', u9:'Saurabh Joshi',
        u10:'Neha Gupta',    u11:'Arjun Pillai',  u12:'Meera Iyer',
      };
      const name = nameMap[params['userId']];
      if (name) {
        this.filterEmployee     = name;
        this.activeContextLabel = `Employee: ${name}`;
      }

    } else if (params['dept']) {
      // Department Overview row click — filter by department
      this.filterDept         = params['dept'];
      this.activeContextLabel = `Department: ${params['dept']}`;

    } else if (params['riskEmployee']) {
      // Risk Overview row click — filter by the risk's reporter
      this.filterEmployee     = params['riskEmployee'];
      this.activeContextLabel = `Risk reported by: ${params['riskEmployee']} (${params['riskDept'] ?? ''})`;
    }

    this.applyFilters();
  }

  // ── Data ─────────────────────────────────────────────────────────

  loadDsrData(): void {
    this.dsrEntries = [
      { id:'d01', employeeName:'Bharat Kumar',   initials:'BK', avatarColor:'#405189', role:'EMPLOYEE', department:'Engineering',
        client:'Acme Corp',  project:'API Gateway',       task:'REST endpoint scaffolding',
        taskFull:'Implemented and tested REST endpoint scaffolding for the payment service. Wrote unit tests, integrated Auth middleware and documented API contracts in Swagger.',
        date:'Mar 18', hours:8, dsrStatus:'approved' },
      { id:'d02', employeeName:'Gaurav Uttam',   initials:'GU', avatarColor:'#0ab39c', role:'MANAGER',  department:'Engineering',
        client:'TechNova',   project:'Cloud Migration',   task:'AWS infra review',
        taskFull:'Conducted full AWS infrastructure review covering EC2, RDS, and VPC configurations. Prepared cost-optimisation report with estimated 18% savings.',
        date:'Mar 18', hours:7, dsrStatus:'approved' },
      { id:'d03', employeeName:'Sumit Verma',    initials:'SV', avatarColor:'#f06548', role:'EMPLOYEE', department:'QA',
        client:'FinEdge',    project:'QA Automation',     task:'Regression suite setup',
        taskFull:'Set up regression test suite for the payment module using Playwright. Covered 42 critical user flows, integrated with CI pipeline on GitHub Actions.',
        date:'Mar 18', hours:6, dsrStatus:'pending' },
      { id:'d04', employeeName:'Ankit Sharma',   initials:'AS', avatarColor:'#f7b731', role:'EMPLOYEE', department:'Engineering',
        client:'Acme Corp',  project:'API Gateway',       task:'Auth middleware integration',
        taskFull:'Integrated OAuth2 auth middleware with token refresh logic. Added rate-limiting headers and tested against load simulation of 500 concurrent users.',
        date:'Mar 17', hours:8, dsrStatus:'approved' },
      { id:'d05', employeeName:'Kuldeep Singh',  initials:'KS', avatarColor:'#8854d0', role:'EMPLOYEE', department:'Design',
        client:'RetailX',    project:'Brand Revamp',      task:'Logo design iteration v3',
        taskFull:'Delivered third iteration of the primary logo, exploring bold sans-serif direction. Client feedback incorporated from v2; brand colours updated per brief.',
        date:'Mar 15', hours:4, dsrStatus:'rejected' },
      { id:'d06', employeeName:'Priya Nair',     initials:'PN', avatarColor:'#e91e8c', role:'EMPLOYEE', department:'Design',
        client:'RetailX',    project:'Brand Revamp',      task:'Component library setup',
        taskFull:'Built out the button, input, and card components in Figma design system. Documented component states (default, hover, focus, disabled) and handed off to engineering.',
        date:'Mar 18', hours:7, dsrStatus:'approved' },
      { id:'d07', employeeName:'Rahul Mehta',    initials:'RM', avatarColor:'#1565c0', role:'EMPLOYEE', department:'QA',
        client:'FinEdge',    project:'QA Automation',     task:'Load testing scripts',
        taskFull:'Wrote k6 load testing scripts targeting the trade execution API. Simulated 1,000 concurrent virtual users; identified two bottlenecks in DB connection pooling.',
        date:'Mar 18', hours:6, dsrStatus:'pending' },
      { id:'d08', employeeName:'Divya Krishnan', initials:'DK', avatarColor:'#00695c', role:'EMPLOYEE', department:'Engineering',
        client:'TechNova',   project:'Cloud Migration',   task:'DB schema migration',
        taskFull:'Wrote and executed database schema migration scripts for PostgreSQL to Aurora RDS. Zero-downtime migration completed with blue-green deployment strategy.',
        date:'Mar 18', hours:8, dsrStatus:'approved' },
      { id:'d09', employeeName:'Saurabh Joshi',  initials:'SJ', avatarColor:'#e65100', role:'EMPLOYEE', department:'Engineering',
        client:'Acme Corp',  project:'Dashboard Rebuild', task:'Chart.js KPI integration',
        taskFull:'Integrated Chart.js into the admin dashboard for KPI visualisation. Built bar, line, and donut chart components with real-time data binding via WebSocket.',
        date:'Mar 17', hours:5, dsrStatus:'pending' },
      { id:'d10', employeeName:'Neha Gupta',     initials:'NG', avatarColor:'#6a1b9a', role:'EMPLOYEE', department:'Design',
        client:'RetailX',    project:'Brand Revamp',      task:'Typography system',
        taskFull:'Defined the full typography scale (H1-H6, body, caption, code) using variable fonts. Delivered usage guidelines and Figma text styles for the team.',
        date:'Mar 13', hours:2, dsrStatus:'rejected' },
      { id:'d11', employeeName:'Arjun Pillai',   initials:'AP', avatarColor:'#2e7d32', role:'EMPLOYEE', department:'QA',
        client:'FinEdge',    project:'Security Audit',    task:'Pen testing auth endpoints',
        taskFull:'Conducted penetration testing across authentication endpoints — login, token refresh, and password reset. Identified and documented 3 medium-severity vulnerabilities.',
        date:'Mar 18', hours:8, dsrStatus:'approved' },
      { id:'d12', employeeName:'Meera Iyer',     initials:'MI', avatarColor:'#c62828', role:'MANAGER',  department:'Design',
        client:'RetailX',    project:'Brand Revamp',      task:'Design system review',
        taskFull:'Conducted cross-functional design system review session with engineering and product leads. Resolved 14 open design debt items and updated the component changelog.',
        date:'Mar 18', hours:7, dsrStatus:'approved' },
    ];

    this.dsrDataSource.data = this.dsrEntries;
  }

  computeStats(): void {
    this.dsrStats = {
      approved:   this.dsrEntries.filter(e => e.dsrStatus === 'approved').length,
      pending:    this.dsrEntries.filter(e => e.dsrStatus === 'pending').length,
      rejected:   this.dsrEntries.filter(e => e.dsrStatus === 'rejected').length,
      totalHours: this.dsrEntries.reduce((s, e) => s + e.hours, 0),
    };
  }

  buildClientGroups(): void {
    const clientMap = new Map<string, Map<string, DsrEntry[]>>();
    for (const entry of this.dsrEntries) {
      if (!clientMap.has(entry.client)) clientMap.set(entry.client, new Map());
      const projMap = clientMap.get(entry.client)!;
      if (!projMap.has(entry.project)) projMap.set(entry.project, []);
      const existing = projMap.get(entry.project)!;
      if (!existing.find(e => e.employeeName === entry.employeeName)) existing.push(entry);
    }

    this.clientGroups = [];
    clientMap.forEach((projMap, clientName) => {
      const projects: ProjectGroup[] = [];
      projMap.forEach((entries, projName) => {
        projects.push({
          name:    projName,
          members: entries.map(e => ({
            name: e.employeeName, initials: e.initials,
            avatarColor: e.avatarColor, role: e.role,
          })),
        });
      });
      const allMembers: MemberRef[] = [
        ...new Map([...projMap.values()].flat().map(e => [e.employeeName, e])).values(),
      ].map(e => ({ name: e.employeeName, initials: e.initials, avatarColor: e.avatarColor, role: e.role }));
      this.clientGroups.push({ name: clientName, members: allMembers, projects });
    });
  }

  // ── Filters ──────────────────────────────────────────────────────

  applyFilters(): void {
    if (!this.dsrDataSource) { return; }
    this.expandedRow = null;
    this.dsrDataSource.filter = JSON.stringify({
      text:     this.searchText.trim().toLowerCase(),
      employee: this.filterEmployee,
      dept:     this.filterDept,
      client:   this.filterClient,
      project:  this.filterProject,
      status:   this.filterStatus,
    });
    this.dsrDataSource.paginator?.firstPage();
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.searchText = this.filterEmployee = this.filterDept
      = this.filterClient = this.filterProject = this.filterStatus = '';
    this.activeContextLabel = '';
    this.applyFilters();
  }

  clearContextFilter(): void {
    this.clearFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterEmployee || this.filterDept
           || this.filterClient || this.filterProject || this.filterStatus);
  }

  get filteredDsrCount(): number { return this.dsrDataSource.filteredData.length; }

  get uniqueEmployees(): string[] { return [...new Set(this.dsrEntries.map(e => e.employeeName))].sort(); }
  get uniqueClients():   string[] { return [...new Set(this.dsrEntries.map(e => e.client))].sort(); }
  get uniqueProjects():  string[] { return [...new Set(this.dsrEntries.map(e => e.project))].sort(); }

  // ── Interaction helpers ───────────────────────────────────────────

  /** Called when a mini-avatar in the relationship map is clicked */
  filterByEmployee(name: string): void {
    this.filterEmployee     = name;
    this.activeContextLabel = `Employee: ${name}`;
    this.applyFilters();
    setTimeout(() => {
      document.querySelector('.sad-table-card')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  toggleExpand(row: DsrEntry): void {
    this.expandedRow = this.expandedRow === row ? null : row;
    this.cdr.detectChanges();
  }

  // ── CSS helpers ──────────────────────────────────────────────────

  getDsrStatusClass(s: string): string {
    return s === 'approved' ? 'sad-status--approved'
         : s === 'pending'  ? 'sad-status--pending'
         : 'sad-status--rejected';
  }

  getDsrStatusIcon(s: string): string {
    return s === 'approved' ? 'check_circle'
         : s === 'pending'  ? 'schedule'
         : 'cancel';
  }

  // ── Actions ──────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/super-admin']);
  }

  exportCSV(): void {
    const headers = ['Employee','Department','Client','Project','Task','Date','Hours','Status'];
    const rows = this.dsrDataSource.filteredData.map(r =>
      [r.employeeName, r.department, r.client, r.project,
       `"${r.taskFull.replace(/"/g, '""')}"`,
       r.date, r.hours, r.dsrStatus].join(',')
    );
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'dsr-activity-log.csv'; a.click();
    URL.revokeObjectURL(url);
    this.snackbar.open('CSV exported successfully', 'Close', { duration: 2500 });
  }
}