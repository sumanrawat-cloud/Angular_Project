import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Risk, Task } from '../../shared/models';
import { TaskDialog } from '../../shared/task-dialog/task-dialog';
import { RiskDialog } from '../../shared/risk-dialog/risk-dialog';

// ─── Extended Task model (add these fields to your models.ts) ───────────────
// export interface Task {
//   id: string;
//   name: string;
//   description: string;
//   hours: number;
//   status: 'pending' | 'in-progress' | 'completed';
//   category?: string;          // NEW: Development | Testing | Meeting | Support | Internal | Leave
//   projectName?: string;       // NEW
//   clientName?: string;        // NEW
//   billable?: boolean;         // NEW (employee sees, manager changes)
// }

export interface TaskDialogData {
  mode: 'add' | 'edit';
  task?: Task;
}

export interface WeekDay {
  date: Date;
  dateKey: string;
  label: string;
  shortDate: string;
  tasks: Task[];
  totalHours: number;
}

export interface DropdownOption {
  value: string;
  label: string;
}

export interface WeekSummary {
  total: number;
  billable: number;
  nonBillable: number;
  approvalStatus: 'draft' | 'submitted' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-employee',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './employee.html',
  styleUrl: './employee.css',
})
export class Employee implements OnInit {
  currentDate: Date = new Date();
  currentView: 'daily' | 'weekly' = 'daily';
  viewTransition = false;

  tasks: { [dateKey: string]: Task[] } = {};
  risks: Risk[] = [];

  _currentTasks: Task[] = [];
  _weekDays: WeekDay[]  = [];

  // ── Filters ───────────────────────────────────────────
  selectedClient  = '';
  selectedProject = '';

  clientOptions: DropdownOption[] = [
    { value: 'acme',     label: 'Acme Corp'    },
    { value: 'globex',   label: 'Globex Inc'   },
    { value: 'initech',  label: 'Initech'      },
    { value: 'umbrella', label: 'Umbrella Ltd' },
  ];

  projectOptions: DropdownOption[] = [
    { value: 'design',    label: 'Design System'   },
    { value: 'api',       label: 'API Integration' },
    { value: 'mobile',    label: 'Mobile App'      },
    { value: 'dashboard', label: 'Dashboard'       },
    { value: 'figma',     label: 'Figma Design'    },
  ];

  // ── Stats ─────────────────────────────────────────────
  statCounts = { total: 0, completed: 0, incomplete: 0, overdue: 0, openRisks: 0 };

  // ── Weekly summary ────────────────────────────────────
  weekSummary: WeekSummary = {
    total: 0, billable: 0, nonBillable: 0, approvalStatus: 'draft'
  };

  // Approval statuses per week — keyed by week-start date
  private approvalMap: { [weekKey: string]: WeekSummary['approvalStatus'] } = {};

  constructor(
    private dialog:  MatDialog,
    private cdr:     ChangeDetectorRef,
    private snackbar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const saved      = localStorage.getItem('ng_tasks');
    const savedRisks = localStorage.getItem('ng_risks');
    const savedAppr  = localStorage.getItem('ng_approvals');

    this.tasks        = saved      ? JSON.parse(saved)      : {};
    this.risks        = savedRisks ? JSON.parse(savedRisks) : [];
    this.approvalMap  = savedAppr  ? JSON.parse(savedAppr)  : {};

    Object.keys(this.tasks).forEach(k => {
      this.tasks[k] = this.tasks[k].map(t => ({ ...t, hours: Number(t.hours) }));
    });

    // Demo seed data
    const key = this.fmtKey(this.currentDate);
    if (!this.tasks[key] || this.tasks[key].length === 0) {
      this.tasks[key] = [
        {
          id: '1', name: 'Design System Updates',
          description: 'Update button components and color palette',
          hours: 5.5, status: 'in-progress',
          category: 'Development', projectName: 'Dashboard', clientName: 'Acme Corp', billable: true
        },
        {
          id: '2', name: 'API Integration',
          description: 'Integrate user authentication API endpoints',
          hours: 3, status: 'completed',
          category: 'Development', projectName: 'API Integration', clientName: 'Globex Inc', billable: true
        },
        {
          id: '3', name: 'Sprint Planning Meeting',
          description: 'Weekly sprint planning with the team',
          hours: 1, status: 'completed',
          category: 'Meeting', projectName: 'Dashboard', clientName: 'Acme Corp', billable: false
        },
      ];
      this.save();
    }

    this.refresh();
  }

  // ── Refresh ────────────────────────────────────────────
  refresh(): void {
    const key = this.fmtKey(this.currentDate);
    this._currentTasks = (this.tasks[key] || []).slice();
    this._weekDays     = this.buildWeekDays();
    this.computeStats();
    this.computeWeekSummary();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  // ── Stats ──────────────────────────────────────────────
  computeStats(): void {
    const today = this.fmtKey(new Date());
    let total = 0, completed = 0, incomplete = 0, overdue = 0;

    Object.entries(this.tasks).forEach(([dateKey, dayTasks]) => {
      dayTasks.forEach(t => {
        total++;
        if (t.status === 'completed') { completed++; }
        else {
          incomplete++;
          if (dateKey < today) overdue++;
        }
      });
    });

    const openRisks = this.risks.filter((r: any) => !r.resolved).length;
    this.statCounts = { total, completed, incomplete, overdue, openRisks };
  }

  // ── Weekly summary ─────────────────────────────────────
  computeWeekSummary(): void {
    const weekKey = this.fmtKey(this.weekStart(this.currentDate));

    // Build week dates always (not just from _weekDays which may be empty in daily view)
    const start = this.weekStart(this.currentDate);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i);
      return this.fmtKey(d);
    });

    let total = 0, billable = 0, nonBillable = 0;
    weekDates.forEach(dk => {
      (this.tasks[dk] || []).forEach((t: any) => {
        total       += Number(t.hours || 0);
        if (t.billable) billable    += Number(t.hours || 0);
        else            nonBillable += Number(t.hours || 0);
      });
    });

    this.weekSummary = {
      total:          Math.round(total * 10) / 10,
      billable:       Math.round(billable * 10) / 10,
      nonBillable:    Math.round(nonBillable * 10) / 10,
      approvalStatus: this.approvalMap[weekKey] || 'draft',
    };
  }

  // ── Submit timesheet ───────────────────────────────────
  submitTimesheet(): void {
    const weekKey = this.fmtKey(this.weekStart(this.currentDate));
    this.approvalMap[weekKey] = 'submitted';
    localStorage.setItem('ng_approvals', JSON.stringify(this.approvalMap));
    this.computeWeekSummary();
    this.cdr.detectChanges();
    this.snackbar.open('✅ Timesheet submitted for approval!', 'Close', {
      duration: 3500,
      panelClass: ['snack-success']
    });
  }

  // ── Approval helpers ───────────────────────────────────
  getApprovalIcon(status: string): string {
    const map: Record<string, string> = {
      draft:     'edit_note',
      submitted: 'hourglass_top',
      approved:  'verified',
      rejected:  'cancel',
    };
    return map[status] || 'edit_note';
  }

  getApprovalLabel(status: string): string {
    const map: Record<string, string> = {
      draft:     'Draft',
      submitted: 'Awaiting Approval',
      approved:  'Approved',
      rejected:  'Rejected',
    };
    return map[status] || 'Draft';
  }

  // ── Filter handlers ────────────────────────────────────
  onFilterChange(): void {
    // Wire to backend/service as needed
  }
  clearFilters(): void {
    this.selectedClient  = '';
    this.selectedProject = '';
  }

  // ── Date helpers ───────────────────────────────────────
  fmtKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  get currentDateKey(): string { return this.fmtKey(this.currentDate); }

  get totalHours(): number {
    return this._currentTasks.reduce((s, t) => s + Number(t.hours || 0), 0);
  }
  get weekTotalHours(): number {
    return this._weekDays.reduce((s, d) => s + d.totalHours, 0);
  }
  get currentRisks(): Risk[] {
    return this.risks.filter(r => r.date === this.currentDateKey);
  }
  get formattedDate(): string {
    return this.currentDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }
  get weekTitle(): string {
    const start = this.weekStart(this.currentDate);
    return `Week of ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  }
  get navDate(): string {
    if (this.currentView === 'weekly') {
      const s = this.weekStart(this.currentDate);
      const e = new Date(s); e.setDate(e.getDate() + 6);
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return this.currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  weekStart(d: Date): Date {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -6 : 1 - dt.getDay()));
    return dt;
  }

  buildWeekDays(): WeekDay[] {
    const start = this.weekStart(this.currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const date    = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dateKey = this.fmtKey(date);
      const tasks   = (this.tasks[dateKey] || []).map(t => ({ ...t, hours: Number(t.hours || 0) }));
      return {
        date, dateKey,
        label:      date.toLocaleDateString('en-US', { weekday: 'long' }),
        shortDate:  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tasks,
        totalHours: tasks.reduce((s, t) => s + t.hours, 0),
      };
    });
  }

  isToday(d: Date): boolean {
    const t = new Date();
    return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate();
  }

  navigateDate(dir: number): void {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + (this.currentView === 'weekly' ? 7 * dir : dir));
    this.currentDate = d;
    this.refresh();
  }
  goToToday(): void { this.currentDate = new Date(); this.refresh(); }

  setView(v: 'daily' | 'weekly'): void {
    this.viewTransition = true;
    setTimeout(() => { this.currentView = v; this.viewTransition = false; this.refresh(); }, 160);
  }

  // ── CRUD ───────────────────────────────────────────────
  openAddDialog(dateKey?: string): void {
    this.dialog.open(TaskDialog, { width: '520px', data: { mode: 'add' } })
      .afterClosed().subscribe((result: Partial<Task> | null) => {
        if (!result) return;
        const key = dateKey || this.currentDateKey;
        const newTask: Task = {
          id:          Date.now().toString(),
          name:        result.name!,
          description: result.description || '',
          hours:       Number(result.hours!),
          status:      result.status || 'pending',
          ...(result as any),
        };
        this.tasks[key] = [...(this.tasks[key] || []), newTask];
        this.save(); this.refresh();
      });
  }

  openEditDialog(task: Task): void {
    this.dialog.open(TaskDialog, { width: '520px', data: { mode: 'edit', task: { ...task } } })
      .afterClosed().subscribe((result: Partial<Task> | null) => {
        if (!result) return;
        for (const key of Object.keys(this.tasks)) {
          const idx = this.tasks[key].findIndex(t => t.id === task.id);
          if (idx !== -1) {
            this.tasks[key] = this.tasks[key].map((t, i) =>
              i === idx ? { ...t, ...result, id: task.id, hours: Number(result.hours) } : t
            );
            break;
          }
        }
        this.save(); this.refresh();
      });
  }

  deleteTask(taskId: string, dateKey?: string): void {
    const key = dateKey || this.currentDateKey;
    this.tasks[key] = (this.tasks[key] || []).filter(t => t.id !== taskId);
    this.save(); this.refresh();
  }

  openRiskDialog(): void {
    this.dialog.open(RiskDialog, {
      width: '480px',
      data: { risks: this.currentRisks, dateKey: this.currentDateKey }
    }).afterClosed().subscribe((updated: Risk[] | undefined) => {
      if (updated === undefined) return;
      this.risks = [ ...this.risks.filter(r => r.date !== this.currentDateKey), ...updated ];
      localStorage.setItem('ng_risks', JSON.stringify(this.risks));
      this.computeStats();
      this.cdr.detectChanges();
    });
  }

  getStatusClass(s: string): string {
    return s === 'in-progress' ? 'card-inprogress' : s === 'completed' ? 'card-completed' : 'card-pending';
  }
  getStatusIcon(s: string): string {
    return s === 'in-progress' ? 'play_circle' : s === 'completed' ? 'check_circle' : 'radio_button_unchecked';
  }
  getStatusLabel(s: string): string {
    return s === 'in-progress' ? 'In Progress' : s === 'completed' ? 'Completed' : 'Pending';
  }

  save(): void { localStorage.setItem('ng_tasks', JSON.stringify(this.tasks)); }
}






























































