import {
  Component, OnInit, AfterViewInit,
  ChangeDetectorRef, ViewChild, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
 
import { MatButtonModule }                    from '@angular/material/button';
import { MatIconModule }                      from '@angular/material/icon';
import { MatTooltipModule }                   from '@angular/material/tooltip';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule }             from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule }   from '@angular/material/paginator';
import { MatDividerModule }                   from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule }     from '@angular/material/snack-bar';
import { MatCardModule }                      from '@angular/material/card';
import { MatFormFieldModule }                 from '@angular/material/form-field';
import { MatInputModule }                     from '@angular/material/input';
import { MatSelectModule }                    from '@angular/material/select';
import { MatButtonToggleModule }              from '@angular/material/button-toggle';
import { MatProgressBarModule }               from '@angular/material/progress-bar';
 
// ─── Types ─────────────────────────────────────────────────
 
interface DsrRow {
  name: string; initials: string; avatarColor: string; role: string;
  department: string; submitted: number; pending: number;
  approved: number; completion: number; status: string;
}
 
interface UtilRow {
  name: string; initials: string; avatarColor: string; role: string;
  department: string; billable: number; total: number;
  utilization: number; trend: 'up' | 'down' | 'stable';
}
 
interface RiskRow {
  text: string; reportedBy: string; initials: string; avatarColor: string;
  department: string; impact: 'high' | 'medium' | 'low';
  date: string; status: 'Open' | 'Resolved';
}

@Component({
  selector: 'app-report',
  standalone:    true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatDividerModule,
    MatSnackBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatProgressBarModule,
  ],
  templateUrl: './report.html',
  styleUrl: './report.css',
})
export class Report implements OnInit, AfterViewInit {
 
  @ViewChild('sort1') sort1!: MatSort;
  @ViewChild('sort2') sort2!: MatSort;
  @ViewChild('sort3') sort3!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
 
  // ── State ───────────────────────────────────────────────
  activeTab    = 'dsr';
  searchTerm   = '';
  tabSwitching = false;
  filters      = { dateRange: 'this_month', department: '' };
 
  dsrColumns  = ['dsr_user', 'dsr_dept', 'dsr_submitted', 'dsr_pending', 'dsr_approved', 'dsr_completion', 'dsr_status'];
  utilColumns = ['util_user', 'util_dept', 'util_billable', 'util_total', 'util_utilization', 'util_trend'];
  riskColumns = ['risk_desc', 'risk_reporter', 'risk_dept', 'risk_impact', 'risk_date', 'risk_status'];
 
  dsrDataSource  = new MatTableDataSource<DsrRow>([]);
  utilDataSource = new MatTableDataSource<UtilRow>([]);
  riskDataSource = new MatTableDataSource<RiskRow>([]);
 
  kpiCards = [
    { label: 'Total DSRs Submitted', value: '248', icon: 'assignment_turned_in',
      iconBg: '#eaecf5', iconColor: '#405189', trend: 12, trendLabel: '12%' },
    { label: 'Avg Utilization',      value: '72%', icon: 'trending_up',
      iconBg: '#e8f8f5', iconColor: '#0ab39c', trend: 5,  trendLabel: '5%'  },
    { label: 'Pending DSRs',         value: '14',  icon: 'pending_actions',
      iconBg: '#fffbeb', iconColor: '#f59e0b', trend: -3, trendLabel: '3'   },
    { label: 'Open Risks',           value: '4',   icon: 'warning_amber',
      iconBg: '#fff0ee', iconColor: '#f06548', trend: 0,  trendLabel: ''    },
  ];
 
  dsrChartData = [
    { day: 'W1', submitted: 18, pending: 4 },
    { day: 'W2', submitted: 22, pending: 3 },
    { day: 'W3', submitted: 15, pending: 6 },
    { day: 'W4', submitted: 28, pending: 2 },
    { day: 'W5', submitted: 24, pending: 5 },
    { day: 'W6', submitted: 20, pending: 3 },
    { day: 'W7', submitted: 31, pending: 1 },
    { day: 'W8', submitted: 26, pending: 4 },
  ];
 
  get maxDsr(): number {
    return Math.max(...this.dsrChartData.map(d => Math.max(d.submitted, d.pending))) + 4;
  }
 
  get yTicks(): number[] {
    const m = this.maxDsr;
    return [m, Math.round(m * .75), Math.round(m * .5), Math.round(m * .25), 0];
  }
 
  avgUtilization = 72;
 
  deptUtil = [
    { name: 'Engineering', util: 77, color: '#405189', key: 'primary' },
    { name: 'QA',          util: 84, color: '#0ab39c', key: 'success' },
    { name: 'Design',      util: 55, color: '#f06548', key: 'warn'    },
  ];
 
  private allDsr: DsrRow[] = [
    { name: 'Bharat Kumar',  initials: 'BK', avatarColor: '#405189', role: 'Employee',
      department: 'Engineering', submitted: 18, pending: 2,  approved: 16, completion: 89,  status: 'Active'   },
    { name: 'Gaurav Uttam',  initials: 'GU', avatarColor: '#0ab39c', role: 'Manager',
      department: 'Engineering', submitted: 20, pending: 0,  approved: 20, completion: 100, status: 'Active'   },
    { name: 'Sumit Verma',   initials: 'SV', avatarColor: '#f06548', role: 'Employee',
      department: 'QA',          submitted: 16, pending: 3,  approved: 13, completion: 81,  status: 'Active'   },
    { name: 'Ankit Sharma',  initials: 'AS', avatarColor: '#f7b731', role: 'Employee',
      department: 'Engineering', submitted: 12, pending: 4,  approved: 8,  completion: 67,  status: 'Active'   },
    { name: 'Kuldeep Singh', initials: 'KS', avatarColor: '#8854d0', role: 'Employee',
      department: 'Design',      submitted: 4,  pending: 6,  approved: 3,  completion: 40,  status: 'Inactive' },
    { name: 'Priya Nair',    initials: 'PN', avatarColor: '#e91e8c', role: 'Employee',
      department: 'Design',      submitted: 14, pending: 1,  approved: 13, completion: 93,  status: 'Active'   },
    { name: 'Rahul Mehta',   initials: 'RM', avatarColor: '#1565c0', role: 'Employee',
      department: 'QA',          submitted: 10, pending: 5,  approved: 7,  completion: 58,  status: 'Active'   },
    { name: 'Meera Iyer',    initials: 'MI', avatarColor: '#c62828', role: 'Manager',
      department: 'Design',      submitted: 22, pending: 0,  approved: 22, completion: 100, status: 'Active'   },
  ];
 
  private allUtil: UtilRow[] = [
    { name: 'Bharat Kumar',  initials: 'BK', avatarColor: '#405189', role: 'Employee',
      department: 'Engineering', billable: 140, total: 176, utilization: 80, trend: 'up'     },
    { name: 'Gaurav Uttam',  initials: 'GU', avatarColor: '#0ab39c', role: 'Manager',
      department: 'Engineering', billable: 160, total: 176, utilization: 91, trend: 'stable' },
    { name: 'Sumit Verma',   initials: 'SV', avatarColor: '#f06548', role: 'Employee',
      department: 'QA',          billable: 120, total: 176, utilization: 68, trend: 'down'   },
    { name: 'Ankit Sharma',  initials: 'AS', avatarColor: '#f7b731', role: 'Employee',
      department: 'Engineering', billable: 100, total: 176, utilization: 57, trend: 'down'   },
    { name: 'Kuldeep Singh', initials: 'KS', avatarColor: '#8854d0', role: 'Employee',
      department: 'Design',      billable: 60,  total: 176, utilization: 34, trend: 'down'   },
    { name: 'Priya Nair',    initials: 'PN', avatarColor: '#e91e8c', role: 'Employee',
      department: 'Design',      billable: 155, total: 176, utilization: 88, trend: 'up'     },
    { name: 'Rahul Mehta',   initials: 'RM', avatarColor: '#1565c0', role: 'Employee',
      department: 'QA',          billable: 110, total: 176, utilization: 63, trend: 'stable' },
    { name: 'Meera Iyer',    initials: 'MI', avatarColor: '#c62828', role: 'Manager',
      department: 'Design',      billable: 168, total: 176, utilization: 95, trend: 'up'     },
  ];
 
  private allRisk: RiskRow[] = [
    { text: 'API endpoints blocked — critical integration at risk',
      reportedBy: 'Bharat Kumar',  initials: 'BK', avatarColor: '#405189',
      department: 'Engineering', impact: 'high',   date: 'Mar 5',  status: 'Open'     },
    { text: 'Client design approval delayed since Monday',
      reportedBy: 'Ankit Sharma',  initials: 'AS', avatarColor: '#f7b731',
      department: 'Engineering', impact: 'medium', date: 'Mar 4',  status: 'Open'     },
    { text: 'Test environment unstable — intermittent failures blocking release',
      reportedBy: 'Sumit Verma',   initials: 'SV', avatarColor: '#f06548',
      department: 'QA',          impact: 'high',   date: 'Mar 5',  status: 'Open'     },
    { text: 'Design system assets pending brand team sign-off',
      reportedBy: 'Priya Nair',    initials: 'PN', avatarColor: '#e91e8c',
      department: 'Design',      impact: 'low',    date: 'Mar 3',  status: 'Open'     },
    { text: 'Backend deployment pipeline failing on staging',
      reportedBy: 'Rahul Mehta',   initials: 'RM', avatarColor: '#1565c0',
      department: 'QA',          impact: 'high',   date: 'Feb 28', status: 'Resolved' },
    { text: 'Third-party SDK license expired — renewal pending',
      reportedBy: 'Gaurav Uttam',  initials: 'GU', avatarColor: '#0ab39c',
      department: 'Engineering', impact: 'medium', date: 'Feb 25', status: 'Resolved' },
  ];
 
  constructor(
    private cdr:      ChangeDetectorRef,
    private snackbar: MatSnackBar,
  ) {}
 
  ngOnInit(): void {
    this.dsrDataSource.data  = this.allDsr;
    this.utilDataSource.data = this.allUtil;
    this.riskDataSource.data = this.allRisk;
    this._setupFilterPredicate();
  }
 
  ngAfterViewInit(): void {
    this._attachSortPaginator();
    this.cdr.detectChanges();
  }
 
  // ── Tab switching ───────────────────────────────────────
  setTab(tab: string): void {
    if (tab === this.activeTab) return;

    this.tabSwitching = true;

    setTimeout(() => {
      this.activeTab  = tab;
      this.searchTerm = '';
      this._applyFilter('');
      this.tabSwitching = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this._attachSortPaginator();
        this._scrollToTable();     // FIX 5 — auto scroll
      });
    }, 260);
  }

  // FIX 5 — smooth scroll to table section after tab switch
  private _scrollToTable(): void {
    const el: Element | null =
      document.getElementById('rp-table-section') ??
      document.querySelector('.rp-table-card');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => window.scrollBy({ top: -16, behavior: 'smooth' }), 320);
  }
 
  // ── Filters ─────────────────────────────────────────────
  applyFilters(): void {
    this._applyFilter(this.searchTerm);
    if (this.paginator) this.paginator.firstPage();
  }
 
  clearFilters(): void {
    this.searchTerm         = '';
    this.filters.department = '';
    this._applyFilter('');
    if (this.paginator) this.paginator.firstPage();
  }
 
  private _applyFilter(term: string): void {
    const f = JSON.stringify({ text: term.toLowerCase(), dept: this.filters.department });
    this.dsrDataSource.filter  = f;
    this.utilDataSource.filter = f;
    this.riskDataSource.filter = f;
  }
 
  private _setupFilterPredicate(): void {
    const pred = (row: any, f: string) => {
      const { text, dept } = JSON.parse(f);
      const nameMatch = !text ||
        (row.name       ?? row.reportedBy ?? '').toLowerCase().includes(text) ||
        (row.text       ?? '').toLowerCase().includes(text) ||
        (row.department ?? '').toLowerCase().includes(text);
      const deptMatch = !dept || row.department === dept;
      return nameMatch && deptMatch;
    };
    (this.dsrDataSource  as any).filterPredicate = pred;
    (this.utilDataSource as any).filterPredicate = pred;
    (this.riskDataSource as any).filterPredicate = pred;
  }
 
  private _attachSortPaginator(): void {
    if (this.sort1) this.dsrDataSource.sort  = this.sort1;
    if (this.sort2) this.utilDataSource.sort = this.sort2;
    if (this.sort3) this.riskDataSource.sort = this.sort3;

    if (this.paginator) {
      const ds = this.activeTab === 'dsr'         ? this.dsrDataSource
               : this.activeTab === 'utilization' ? this.utilDataSource
               : this.riskDataSource;
      ds.paginator = this.paginator;
      this.paginator.pageSize = 5;
      this.paginator.firstPage();
    }
  }
 
  get filteredCount(): number {
    if (this.activeTab === 'dsr')         return this.dsrDataSource.filteredData.length;
    if (this.activeTab === 'utilization') return this.utilDataSource.filteredData.length;
    return this.riskDataSource.filteredData.length;
  }
 
  getProgClass(val: number): string {
    if (val >= 80) return 'rp-prog-high';
    if (val >= 50) return 'rp-prog-mid';
    return 'rp-prog-low';
  }
 
  getImpactIcon(impact: string): string {
    if (impact === 'high')   return 'error';
    if (impact === 'medium') return 'warning';
    return 'info';
  }
 
  exportCSV(): void {
    const headers = ['Name', 'Department', 'Submitted', 'Pending', 'Approved', 'Completion', 'Status'];
    const rows    = this.dsrDataSource.filteredData.map(r =>
      [r.name, r.department, r.submitted, r.pending, r.approved, r.completion + '%', r.status].join(',')
    );
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'dsr-report.csv'; a.click();
    URL.revokeObjectURL(url);
    this.snackbar.open('📥 CSV exported successfully', 'Close', { duration: 2500 });
  }
 
  exportPDF(): void {
    window.print();
    this.snackbar.open('🖨️ Print dialog opened', 'Close', { duration: 2000 });
  }
}