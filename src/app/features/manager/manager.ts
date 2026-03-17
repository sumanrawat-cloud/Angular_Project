import {
  Component, OnInit, AfterViewInit,
  ChangeDetectorRef, ViewChild, ViewEncapsulation, TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS, NativeDateAdapter, DateAdapter } from '@angular/material/core';

// ─── DD/MM/YYYY date format for the datepicker filter field ──────────────────
const DD_MM_YYYY_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: string): string {
    if (displayFormat === 'DD/MM/YYYY') {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return super.format(date, displayFormat);
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  plannedHours: number;
  loggedHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilization: number;
  taskCount: number;
  approvalStatus: 'approved' | 'pending' | 'cancelled';
  noWork: boolean;
  weekKey: string;
  date: Date;
  clientName: string;
  projectName: string;
}

export interface TeamRisk {
  id: string;
  memberName: string;
  text: string;
  impact: 'low' | 'medium' | 'high';
  date: string;
  escalationRequired: boolean;
}

export interface CategoryBreakdown {
  name: string;
  hours: number;
  icon: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-manager',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [
    { provide: DateAdapter, useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS },
  ],
  templateUrl: './manager.html',
  styleUrl: './manager.css',
})
export class Manager implements OnInit, AfterViewInit {

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('approveConfirmTpl') approveConfirmTpl!: TemplateRef<any>;

  currentWeekDate = new Date();

  dataSource = new MatTableDataSource<TeamMember>([]);

  searchText = '';
  filterDate: Date | null = null;
  filterWeek = '';

  weekOptions: { value: string; label: string }[] = [];

  teamTableColumns: string[] = [
    'employee', 'date', 'ClientName', 'Project', 'action',
  ];

  teamMembers: TeamMember[] = [];
  teamRisks: TeamRisk[] = [];
  categoryBreakdown: CategoryBreakdown[] = [];

  teamStats = {
    total: 0, pendingApprovals: 0, avgUtilization: 0,
    openRisks: 0, blockedTasks: 0, noWorkAssigned: 0,
  };

  constructor(
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private snackbar: MatSnackBar,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.buildWeekOptions();
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    this.dataSource.sortingDataAccessor = (member, column) => {
      switch (column) {
        case 'employee': return member.name.toLowerCase();
        case 'date': return member.date.getTime();
        case 'ClientName': return member.clientName;
        case 'Project': return member.projectName;
        default: return '';
      }
    };

    this.dataSource.filterPredicate = (member: TeamMember, filter: string) => {
      const f = JSON.parse(filter);
      const textMatch = !f.text ||
        member.name.toLowerCase().includes(f.text) ||
        member.role.toLowerCase().includes(f.text) ||
        member.approvalStatus.toLowerCase().includes(f.text);
      const weekMatch = !f.week || member.weekKey === f.week;
      // Date filter: compare formatted date strings
      const dateMatch = !f.date || this.fmtKey(member.date) === f.date;
      return textMatch && weekMatch && dateMatch;
    };

    this.cdr.detectChanges();
  }

  // ── Build human-friendly week options ────────────────
  // All Weeks | This Week | Last Week | Week 1 … Week 4
  private buildWeekOptions(): void {
    const now = new Date();
    this.weekOptions = [{ value: '', label: 'All Weeks' }];
    const humanLabels = ['This Week', 'Last Week', 'Week 1', 'Week 2', 'Week 3', 'Week 4'];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const ws = this.weekStart(d);
      const key = this.fmtKey(ws);
      this.weekOptions.push({ value: key, label: humanLabels[i] });
    }
  }

  applyFilters(): void {
    const filterValue = JSON.stringify({
      text: this.searchText.trim().toLowerCase(),
      week: this.filterWeek,
      // Pass formatted date string so filterPredicate can compare cleanly
      date: this.filterDate ? this.fmtKey(this.filterDate) : '',
    });
    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterDate = null;
    this.filterWeek = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterDate || this.filterWeek);
  }

  get filteredCount(): number {
    return this.dataSource.filteredData.length;
  }

  // ── Load / seed data ──────────────────────────────────
  loadData(): void {
    const wk = this.weekLabel;

    const approvals: Record<string, string> = JSON.parse(
      localStorage.getItem('ng_approvals') || '{}'
    );

    const getStatus = (memberId: string): TeamMember['approvalStatus'] => {
      const weekStartKey = this.fmtKey(this.weekStart(this.currentWeekDate));
      const saved = approvals[weekStartKey + '_' + memberId];
      if (saved === 'approved') return 'approved';
      if (saved === 'cancelled') return 'cancelled';
      return 'pending';
    };

    const allTasks: Record<string, any[]> = JSON.parse(
      localStorage.getItem('ng_tasks') || '{}'
    );
    const weekStart = this.weekStart(this.currentWeekDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i);
      return this.fmtKey(d);
    });

    let currentUserHours = 0, currentUserBillable = 0,
      currentUserNonBillable = 0, currentUserTaskCount = 0;
    weekDates.forEach(dk => {
      (allTasks[dk] || []).forEach((t: any) => {
        currentUserHours += Number(t.hours || 0);
        currentUserTaskCount += 1;
        if (t.billable) currentUserBillable += Number(t.hours || 0);
        else currentUserNonBillable += Number(t.hours || 0);
      });
    });
    const currentUtil = Math.min(Math.round((currentUserHours / 40) * 100), 100);

    // Helper: date offset from current week start
    const ws = this.weekStart(this.currentWeekDate);
    const d = (offset: number): Date => {
      const dt = new Date(ws); dt.setDate(dt.getDate() + offset); return dt;
    };

    this.teamMembers = [
      {
        id: '1', name: 'Bharat Kumar', initials: 'BK',
        avatarColor: '#405189', role: 'Developer', plannedHours: 40,
        loggedHours: currentUserHours || 38, billableHours: currentUserBillable || 32,
        nonBillableHours: currentUserNonBillable || 6,
        utilization: currentUtil || 95, taskCount: currentUserTaskCount || 8,
        approvalStatus: getStatus('1'), noWork: false, weekKey: wk, date: d(0),
        clientName: 'Acme Corp', projectName: 'Portal Redesign',
      },
      {
        id: '2', name: 'Gaurav Uttam', initials: 'GU',
        avatarColor: '#0ab39c', role: 'Developer', plannedHours: 40, loggedHours: 40,
        billableHours: 36, nonBillableHours: 4, utilization: 100, taskCount: 10,
        approvalStatus: getStatus('2'), noWork: false, weekKey: wk, date: d(1),
        clientName: 'TechNova', projectName: 'API Integration',
      },
      {
        id: '3', name: 'Sumit Verma', initials: 'SV',
        avatarColor: '#f06548', role: 'Tester', plannedHours: 40, loggedHours: 32,
        billableHours: 28, nonBillableHours: 4, utilization: 80, taskCount: 6,
        approvalStatus: getStatus('3'), noWork: false, weekKey: wk, date: d(2),
        clientName: 'GlobalBank', projectName: 'QA Automation',
      },
      {
        id: '4', name: 'Ankit Sharma', initials: 'AS',
        avatarColor: '#f7b731', role: 'Developer', plannedHours: 40, loggedHours: 16,
        billableHours: 12, nonBillableHours: 4, utilization: 40, taskCount: 3,
        approvalStatus: getStatus('4'), noWork: false, weekKey: wk, date: d(3),
        clientName: 'Acme Corp', projectName: 'Mobile App',
      },
      {
        id: '5', name: 'Kuldeep Singh', initials: 'KS',
        avatarColor: '#8854d0', role: 'Designer', plannedHours: 40, loggedHours: 0,
        billableHours: 0, nonBillableHours: 0, utilization: 0, taskCount: 0,
        approvalStatus: getStatus('5'), noWork: true, weekKey: wk, date: d(4),
        clientName: 'Unassigned', projectName: 'Unassigned',
      },
      {
        id: '6', name: 'Priya Nair', initials: 'PN',
        avatarColor: '#e91e8c', role: 'Designer', plannedHours: 40, loggedHours: 36,
        billableHours: 30, nonBillableHours: 6, utilization: 90, taskCount: 7,
        approvalStatus: getStatus('6'), noWork: false, weekKey: wk, date: d(0),
        clientName: 'TechNova', projectName: 'Brand Refresh',
      },
      {
        id: '7', name: 'Rahul Mehta', initials: 'RM',
        avatarColor: '#1565c0', role: 'Tester', plannedHours: 40, loggedHours: 28,
        billableHours: 22, nonBillableHours: 6, utilization: 70, taskCount: 5,
        approvalStatus: getStatus('7'), noWork: false, weekKey: wk, date: d(1),
        clientName: 'GlobalBank', projectName: 'Regression Suite',
      },
      {
        id: '8', name: 'Divya Krishnan', initials: 'DK',
        avatarColor: '#00695c', role: 'Developer', plannedHours: 40, loggedHours: 40,
        billableHours: 38, nonBillableHours: 2, utilization: 100, taskCount: 11,
        approvalStatus: getStatus('8'), noWork: false, weekKey: wk, date: d(2),
        clientName: 'Acme Corp', projectName: 'Backend Services',
      },
      {
        id: '9', name: 'Saurabh Joshi', initials: 'SJ',
        avatarColor: '#e65100', role: 'Developer', plannedHours: 40, loggedHours: 20,
        billableHours: 16, nonBillableHours: 4, utilization: 50, taskCount: 4,
        approvalStatus: getStatus('9'), noWork: false, weekKey: wk, date: d(3),
        clientName: 'FinEdge', projectName: 'Dashboard v2',
      },
      {
        id: '10', name: 'Neha Gupta', initials: 'NG',
        avatarColor: '#6a1b9a', role: 'Designer', plannedHours: 40, loggedHours: 0,
        billableHours: 0, nonBillableHours: 0, utilization: 0, taskCount: 0,
        approvalStatus: getStatus('10'), noWork: true, weekKey: wk, date: d(4),
        clientName: 'Unassigned', projectName: 'Unassigned',
      },
      {
        id: '11', name: 'Arjun Pillai', initials: 'AP',
        avatarColor: '#2e7d32', role: 'Tester', plannedHours: 40, loggedHours: 35,
        billableHours: 30, nonBillableHours: 5, utilization: 87, taskCount: 8,
        approvalStatus: getStatus('11'), noWork: false, weekKey: wk, date: d(0),
        clientName: 'FinEdge', projectName: 'Performance Testing',
      },
      {
        id: '13', name: 'Ankit Iyer', initials: 'MI',
        avatarColor: '#c62828', role: 'Developer', plannedHours: 40, loggedHours: 38,
        billableHours: 34, nonBillableHours: 4, utilization: 95, taskCount: 9,
        approvalStatus: getStatus('13'), noWork: false, weekKey: wk, date: d(1),
        clientName: 'TechNova', projectName: 'Cloud Migration',
      },
       {
        id: '14', name: 'Rishabh', initials: 'R',
        avatarColor: '#c62828', role: 'Developer', plannedHours: 40, loggedHours: 38,
        billableHours: 34, nonBillableHours: 4, utilization: 95, taskCount: 9,
        approvalStatus: getStatus('14'), noWork: false, weekKey: wk, date: d(1),
        clientName: 'TechNova', projectName: 'Cloud Migration',
      },
       {
        id: '15', name: 'Meera Iyer', initials: 'MI',
        avatarColor: '#c62828', role: 'Developer', plannedHours: 40, loggedHours: 38,
        billableHours: 34, nonBillableHours: 4, utilization: 95, taskCount: 9,
        approvalStatus: getStatus('15'), noWork: false, weekKey: wk, date: d(1),
        clientName: 'TechNova', projectName: 'Cloud Migration',
      },
       {
        id: '16', name: 'Yssh', initials: 'Y',
        avatarColor: '#c62828', role: 'AI Developer', plannedHours: 40, loggedHours: 38,
        billableHours: 34, nonBillableHours: 4, utilization: 95, taskCount: 9,
        approvalStatus: getStatus('16'), noWork: false, weekKey: wk, date: d(1),
        clientName: 'TechNova', projectName: 'Cloud Migration',
      },
       {
        id: '17', name: 'Vikas', initials: 'V',
        avatarColor: '#c62828', role: 'AI Developer', plannedHours: 40, loggedHours: 38,
        billableHours: 34, nonBillableHours: 4, utilization: 95, taskCount: 9,
        approvalStatus: getStatus('17'), noWork: false, weekKey: wk, date: d(1),
        clientName: 'TechNova', projectName: 'Cloud Migration',
      },
    ];

    this.dataSource.data = this.teamMembers;
    if (this.hasActiveFilters) { this.applyFilters(); }

    this.teamRisks = [
      {
        id: 'r1', memberName: 'Bharat Kumar',
        text: 'API endpoints not ready — blocking integration work',
        impact: 'high', date: 'Mar 5', escalationRequired: true
      },
      {
        id: 'r2', memberName: 'Ankit Sharma',
        text: 'Waiting for client design approval since Monday',
        impact: 'medium', date: 'Mar 4', escalationRequired: false
      },
      {
        id: 'r3', memberName: 'Gaurav Uttam',
        text: 'Dev environment unstable — intermittent test failures',
        impact: 'low', date: 'Mar 5', escalationRequired: false
      },
    ];

    this.categoryBreakdown = [
      { name: 'Development', hours: 96, icon: 'code', color: '#2563eb', bgColor: '#eff6ff' },
      { name: 'Code Review', hours: 14, icon: 'rate_review', color: '#405189', bgColor: '#eaecf5' },
      { name: 'Testing', hours: 32, icon: 'bug_report', color: '#16a34a', bgColor: '#f0fdf4' },
      { name: 'Meetings', hours: 16, icon: 'groups', color: '#f59e0b', bgColor: '#fffbeb' },
      { name: 'Support', hours: 12, icon: 'support_agent', color: '#8854d0', bgColor: '#f5f3ff' },
      { name: 'Idle / No Work', hours: 0, icon: 'hourglass_empty', color: '#9ca3af', bgColor: '#f9fafb' },
    ];

    this.computeStats();
  }

  computeStats(): void {
    const total = this.teamMembers.length;
    const pendingApprovals = this.teamMembers.filter(m => m.approvalStatus === 'pending').length;
    const avgUtilization = total
      ? Math.round(this.teamMembers.reduce((s, m) => s + m.utilization, 0) / total) : 0;
    const openRisks = this.teamRisks.length;
    const blockedTasks = this.teamRisks.filter(r => r.impact === 'high').length;
    const noWorkAssigned = this.teamMembers.filter(m => m.noWork).length;
    this.teamStats = { total, pendingApprovals, avgUtilization, openRisks, blockedTasks, noWorkAssigned };
  }

  // ── Per-member DSR decision status ────────────────────
  getMemberDecisionStatus(member: TeamMember): 'approved' | 'cancelled' | 'pending' {
    if (member.approvalStatus === 'approved') return 'approved';
    if (member.approvalStatus === 'cancelled') return 'cancelled';
    const entryKey = `ng_entry_decisions_${member.id}`;
    const raw = localStorage.getItem(entryKey);
    if (raw) {
      try {
        const decisions: Record<string, string> = JSON.parse(raw);
        const vals = Object.values(decisions);
        if (vals.some(v => v === 'approved')) return 'approved';
        if (vals.length > 0 && vals.every(v => v === 'cancelled')) return 'cancelled';
      } catch { /* ignore */ }
    }
    return 'pending';
  }

  getViewBtnClass(member: TeamMember): string {
    const status = this.getMemberDecisionStatus(member);
    if (status === 'approved') return 'tt-view-btn--approved';
    if (status === 'cancelled') return 'tt-view-btn--cancelled';
    return '';
  }

  getViewBtnTooltip(member: TeamMember): string {
    const status = this.getMemberDecisionStatus(member);
    if (status === 'approved') return 'DSR Approved — view details';
    if (status === 'cancelled') return 'DSR Cancelled — view details';
    return 'View DSR';
  }

  // ── Getters ───────────────────────────────────────────
  get pendingMembers(): TeamMember[] {
    return this.teamMembers.filter(m => m.approvalStatus === 'pending');
  }
  get totalRisks(): number { return this.teamRisks.length; }
  get maxCategoryHours(): number {
    return Math.max(...this.categoryBreakdown.map(c => c.hours), 1);
  }
  getCategoryPct(hours: number): number {
    const total = this.categoryBreakdown.reduce((s, c) => s + c.hours, 0);
    return total ? Math.round((hours / total) * 100) : 0;
  }

  getFormattedDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // ── Week navigation ───────────────────────────────────
  get weekLabel(): string {
    const s = this.weekStart(this.currentWeekDate);
    const e = new Date(s); e.setDate(e.getDate() + 6);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  fmtKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  weekStart(d: Date): Date {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -6 : 1 - dt.getDay()));
    return dt;
  }

  navigateWeek(dir: number): void {
    const d = new Date(this.currentWeekDate);
    d.setDate(d.getDate() + 7 * dir);
    this.currentWeekDate = d;
    this.loadData();
  }
  goToCurrentWeek(): void { this.currentWeekDate = new Date(); this.loadData(); }

  // ── Approval actions ──────────────────────────────────
  pendingApproveMember: TeamMember | null = null;

  openApproveConfirm(member: TeamMember): void {
    this.pendingApproveMember = member;
    this.dialog.open(this.approveConfirmTpl, {
      width: '480px',
      panelClass: 'mgr-confirm-dialog',
      disableClose: true,
    });
  }

  confirmApprove(): void {
    if (!this.pendingApproveMember) return;
    const member = this.pendingApproveMember;
    this.dialog.closeAll();
    this.pendingApproveMember = null;
    member.approvalStatus = 'approved';
    const approvals: Record<string, string> = JSON.parse(localStorage.getItem('ng_approvals') || '{}');
    const wk = this.fmtKey(this.weekStart(this.currentWeekDate));
    approvals[wk + '_' + member.id] = 'approved';
    localStorage.setItem('ng_approvals', JSON.stringify(approvals));
    this.dataSource.data = [...this.teamMembers];
    this.computeStats(); this.cdr.detectChanges();
    this.snackbar.open(`✅ ${member.name}'s timesheet approved!`, 'Close', { duration: 3000, panelClass: ['snack-success'] });
  }

  cancelApprove(): void {
    this.dialog.closeAll();
    this.pendingApproveMember = null;
  }

  approveTimesheet(member: TeamMember): void {
    this.openApproveConfirm(member);
  }

  openRejectDialog(member: TeamMember): void {
    const reason = prompt(`Cancellation reason for ${member.name}:\n(Employee will be notified)`);
    if (reason === null) return;
    member.approvalStatus = 'cancelled';
    const approvals: Record<string, string> = JSON.parse(localStorage.getItem('ng_approvals') || '{}');
    const wk = this.fmtKey(this.weekStart(this.currentWeekDate));
    approvals[wk + '_' + member.id] = 'cancelled';
    localStorage.setItem('ng_approvals', JSON.stringify(approvals));
    this.dataSource.data = [...this.teamMembers];
    this.computeStats(); this.cdr.detectChanges();
    this.snackbar.open(`❌ ${member.name}'s timesheet cancelled.`, 'Close', { duration: 3000, panelClass: ['snack-warn'] });
  }

  approveAll(): void { this.pendingMembers.forEach(m => this.approveTimesheet(m)); }

  viewMemberDsr(member: TeamMember): void {
    localStorage.setItem('mgr_review_member', JSON.stringify(member));
    // Clear any stale filter state so the page opens showing only the selected record.
    localStorage.removeItem('mgr_active_filters');
    this.router.navigate(['/manager/dsr-review', member.id]);
  }

  exportReport(): void {
    this.snackbar.open('📊 Report export started...', 'Close', { duration: 2500 });
  }

  // ── Status helpers ────────────────────────────────────
  getUtilClass(util: number): string {
    if (util >= 90) return 'util-high';
    if (util >= 60) return 'util-mid';
    if (util >= 30) return 'util-low';
    return 'util-zero';
  }

  getApprovalIcon(status: string): string {
    return ({
      pending: 'hourglass_top',
      approved: 'verified',
      cancelled: 'cancel',
    } as any)[status] ?? 'hourglass_top';
  }

  getApprovalLabel(status: string): string {
    return ({
      pending: 'Pending',
      approved: 'Approved',
      cancelled: 'Cancelled',
    } as any)[status] ?? 'Pending';
  }
}