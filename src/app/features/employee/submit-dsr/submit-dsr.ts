import {
  Component, OnInit, OnDestroy, AfterViewInit,
  Inject, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ReactiveFormsModule, FormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { MatCardModule }      from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatSelectModule }    from '@angular/material/select';
import { MatDatepickerModule }from '@angular/material/datepicker';
import {
  MatNativeDateModule, NativeDateAdapter,
  DateAdapter, MAT_DATE_FORMATS,
} from '@angular/material/core';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatSliderModule }    from '@angular/material/slider';
import { MatCheckboxModule }  from '@angular/material/checkbox';
import { MatTooltipModule }   from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDividerModule }   from '@angular/material/divider';

import { DsrDataService, DsrTimeCategory } from '../../../core/services/dsr-data-service';

/* ─── DD/MM/YYYY Date Adapter ───────────────────────────────── */
export class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override parse(value: string): Date | null {
    if (!value) return null;
    const parts = value.trim().split('/');
    if (parts.length === 3) {
      const day = +parts[0], month = +parts[1] - 1, year = +parts[2];
      if (!isNaN(day) && !isNaN(month) && !isNaN(year))
        return new Date(year, month, day);
    }
    return super.parse(value);
  }
  override format(date: Date, displayFormat: string): string {
    if (displayFormat === 'input') {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}
export const DD_MM_YYYY_FORMATS = {
  parse:   { dateInput: 'input' },
  display: {
    dateInput: 'input', monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL', monthYearA11yLabel: 'MMMM YYYY',
  },
};

/* ─── Confirm Dialog ────────────────────────────────────────── */
@Component({
  selector: 'app-confirm-submit-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="dcd-wrap">
      <div class="dcd-icon-ring">
        <mat-icon>help_outline</mat-icon>
      </div>
      <h2 class="dcd-title">Confirm Submission</h2>
      <p class="dcd-body">Are you sure you want to submit this Daily Status Report?</p>
      <!--<p class="dcd-sub">This action cannot be undone once confirmed.</p>-->
      <div class="dcd-actions">
        <button mat-dialog-close="cancel" class="dcd-btn dcd-btn--cancel">
          Cancel
        </button>
        <button mat-dialog-close="confirm" class="dcd-btn dcd-btn--confirm">
          <mat-icon>check_circle</mat-icon> Confirm
        </button>
      </div>
    </div>`,
  styles: [`
    .dcd-wrap {
      padding: 36px 32px 28px;
      text-align: center;
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }
    .dcd-icon-ring {
          width: 40px;
    height: 40px;
      border-radius: 50%;
      background: #eef0f7;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 0 0 8px rgba(64,81,137,.07);
    }
    .dcd-icon-ring mat-icon {
      font-size: 25px;
      color: #405189;
    }
    .dcd-title {
       font-size: 15px;
    font-weight: 700;
    color: #12141f;
    margin: 0 0 10px;
    letter-spacing: 0.5px;
    }
    .dcd-body {
      font-size: 12px; color: #495057;
      margin: 0 0 6px; line-height: 1.5;
    }
    .dcd-sub {
      font-size: 12px; color: #878a99;
      margin: 0 0 28px;
    }
    .dcd-actions {
      display: flex; justify-content: center; gap: 12px;
      margin-top: 25px;
    }
    .dcd-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 24px;
      border-radius: 8px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      border: none; outline: none;
      transition: background .18s, box-shadow .18s, transform .15s;
      &:active { transform: scale(.97); }
    }
    .dcd-btn--cancel {
      background: #f3f6f9;
      color: #6c757d;
      border: 1px solid #e9ebec;
      &:hover { background: #e9ebec; color: #495057; }
    }
    .dcd-btn--confirm {
      background: #405189;
      color: #fff;
      box-shadow: 0 3px 10px rgba(64,81,137,.25);
      mat-icon { font-size: 16px; height: 16px; width: 16px; }
      &:hover {
        background: #364474;
        box-shadow: 0 5px 14px rgba(64,81,137,.35);
      }
    }
  `],
})
export class ConfirmSubmitDialogComponent {}

/* ─── Success Dialog ────────────────────────────────────────── */
@Component({
  selector: 'app-success-submit-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="dsd-wrap">
      <div class="dsd-icon-ring">
        <mat-icon>check_circle</mat-icon>
      </div>
      <h2 class="dsd-title">Submitted Successfully!</h2>
      <p class="dsd-body">Data has been submitted successfully.</p>
      <p class="dsd-sub">Your DSR for <strong>{{ data.date | date:'mediumDate' }}</strong> has been recorded.</p>
      <div class="dsd-actions">
        <button mat-dialog-close class="dsd-btn">
          <mat-icon>arrow_forward</mat-icon> View Submission
        </button>
      </div>
    </div>`,
  styles: [`
    .dsd-wrap {
      padding: 36px 32px 28px;
      text-align: center;
      font-family: 'Inter';
    }
    .dsd-icon-ring {
      width: 40px;
    height: 40px;
      border-radius: 50%;
      background: rgba(10, 179, 156, .12);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 0 0 10px rgba(10, 179, 156, .07);
    }
    .dsd-icon-ring mat-icon {
      font-size: 25px;
      color: #0ab39c;
    }
    .dsd-title {
      font-size: 15px; font-weight: 700;
      color: #12141f; margin: 0 0 10px;
    }
    .dsd-body {
     font-size: 13px;
    color: #495057;
    margin: 0 0 6px;
    line-height: 1.5;
    letter-spacing: 0.5px;
    font-family: 'Inter';
    }
    .dsd-sub {
       font-size: 11px;
    color: #878a99;
    margin: 0 0 28px;
    letter-spacing: 0.5px;
}
    .dsd-actions { display: flex; justify-content: center; }
    .dsd-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 28px;
      border-radius: 8px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      border: 1px solid #e9ebec;
      background: #f3f6f9;
      color: #212529;
      outline: none;
      transition: background .18s, box-shadow .18s, transform .15s;
      mat-icon { font-size: 16px; height: 16px; width: 16px; }
      &:hover {
        background: #e9ebec;
        box-shadow: 0 3px 8px rgba(56,65,74,.12);
      }
      &:active { transform: scale(.97); }
    }
  `],
})
export class SuccessSubmitDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { date: Date }) {}
}

/* ─── Extended category interface ───────────────────────────── */
export interface DsrTimeCategoryEx extends DsrTimeCategory {
  description?: string;
  isAutoCalc?:  boolean;
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-submit-dsr',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatSliderModule,
    MatCheckboxModule, MatTooltipModule, MatSnackBarModule,
    MatExpansionModule, MatDialogModule, MatDividerModule,
    DecimalPipe,
  ],
  providers: [
    { provide: DateAdapter,      useClass: DdMmYyyyDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS  },
  ],
  templateUrl: './submit-dsr.html',
  styleUrl:    './submit-dsr.css',
})
export class SubmitDsr implements OnInit, AfterViewInit, OnDestroy {

  isReady = false;

  dsrForm!:   FormGroup;
  today       = new Date();
  weeklyHours = 12;
  weeklyTarget= 40;
  completionPercent   = 50;
  showOptionalDetails = false;

  clients  = ['Acme Corp', 'Beta Solutions', 'Gamma Inc', 'Delta Tech'];
  projects = ['Website Redesign', 'Mobile App', 'API Integration', 'Data Pipeline'];

  selectedStatus    = 'on_track';
  atRiskDescription = '';
  showRiskTextarea  = false;

  timeCategories: DsrTimeCategoryEx[] = [];
  maxDailyHours = 8;

  private _navSub!: Subscription;

  get manualCategories(): DsrTimeCategoryEx[] {
    return this.timeCategories.filter(c => !c.isAutoCalc);
  }
  get idleCat(): DsrTimeCategoryEx {
    return this.timeCategories.find(c => c.key === 'idle_time')!;
  }
  get manualTotal(): number {
    return this.manualCategories.reduce((s, c) => s + c.hours, 0);
  }
  get weeklyPercent(): number {
    return Math.min((this.weeklyHours / this.weeklyTarget) * 100, 100);
  }

  constructor(
    private fb:       FormBuilder,
    private snackBar: MatSnackBar,
    private dialog:   MatDialog,
    private router:   Router,
    private dsrState: DsrDataService,
    private cdr:      ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildState();
    this._navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        if (String(e.urlAfterRedirects ?? e.url).includes('submit-dsr')) {
          this.buildState();
          this.cdr.markForCheck();
        }
      });
  }

  ngAfterViewInit(): void {
    Promise.resolve().then(() => {
      this.isReady = true;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this._navSub?.unsubscribe();
  }

  private buildState(): void {
    this.isReady             = false;
    this.today               = new Date();
    this.selectedStatus      = 'on_track';
    this.atRiskDescription   = '';
    this.showRiskTextarea    = false;
    this.completionPercent   = 50;
    this.showOptionalDetails = false;

    this.timeCategories = [
      { key: 'development',      label: 'Development',          icon: 'code',         hours: 0, color: '#3b82f6', description: '' },
      { key: 'internal_meeting', label: 'Internal Meeting',     icon: 'groups',       hours: 0, color: '#a855f7', description: '' },
      { key: 'client_meeting',   label: 'Client Meeting',       icon: 'handshake',    hours: 0, color: '#f97316', description: '' },
      { key: 'training',         label: 'Training or Learning', icon: 'school',       hours: 0, color: '#06b6d4', description: '' },
      { key: 'idle_time',        label: 'Idle Time',            icon: 'pause_circle', hours: 8, color: '#6b7280', description: '', isAutoCalc: true },
    ];

    this.dsrForm = this.fb.group({
      dsrDate:        [null, Validators.required],
      allowBackfill:  [false],
      client:         ['', Validators.required],
      project:        ['', Validators.required],
      tasksCompleted: [''],
      blockers:       [''],
      tomorrowPlan:   [''],
    });
  }

  private recalcIdleTime(): void {
    this.idleCat.hours = Math.max(this.maxDailyHours - this.manualTotal, 0);
  }

  incrementHours(cat: DsrTimeCategoryEx): void {
    if (cat.isAutoCalc || this.manualTotal >= this.maxDailyHours) return;
    cat.hours = parseFloat((cat.hours + 0.5).toFixed(1));
    this.recalcIdleTime();
  }

  decrementHours(cat: DsrTimeCategoryEx): void {
    if (cat.isAutoCalc || cat.hours <= 0) return;
    cat.hours = parseFloat((cat.hours - 0.5).toFixed(1));
    this.recalcIdleTime();
  }

  getBarWidth(hours: number): number {
    return Math.min((hours / this.maxDailyHours) * 100, 100);
  }

  setStatus(s: string): void {
    this.selectedStatus   = s;
    this.showRiskTextarea = (s === 'at_risk');
    if (s !== 'at_risk') this.atRiskDescription = '';
  }

  toggleOptionalDetails(): void {
    this.showOptionalDetails = !this.showOptionalDetails;
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  onSubmit(): void {
    if (this.dsrForm.invalid) { this.dsrForm.markAllAsTouched(); return; }
    if (this.manualTotal === 0) {
      this.snackBar.open('Please log at least some hours in a category.', 'Dismiss', { duration: 3000 });
      return;
    }
    this.dialog
      .open(ConfirmSubmitDialogComponent, {
        width: '420px', disableClose: true, panelClass: 'dsr-dialog-panel',
      })
      .afterClosed()
      .subscribe((r: string) => { if (r === 'confirm') this.doSubmit(); });
  }

  private doSubmit(): void {
    const v = this.dsrForm.value;
    this.dsrState.save({
      dsrDate:           v.dsrDate,
      allowBackfill:     v.allowBackfill,
      client:            v.client,
      project:           v.project,
      taskStatus:        this.selectedStatus,
      atRiskDescription: this.selectedStatus === 'at_risk' ? this.atRiskDescription : undefined,
      timeByCategory:    this.timeCategories.reduce((a, c) => ({ ...a, [c.key]: c.hours }), {}),
      timeCategories:    this.timeCategories.map(c => ({ ...c })),
      tasksCompleted:    v.tasksCompleted,
      completionPercent: this.completionPercent,
      totalHours:        this.maxDailyHours,
      blockers:          v.blockers     || undefined,
      tomorrowPlan:      v.tomorrowPlan || undefined,
      submittedAt:       new Date(),
    });
    this.dialog
      .open(SuccessSubmitDialogComponent, {
        width: '420px', disableClose: true,
        panelClass: 'dsr-dialog-panel', data: { date: v.dsrDate },
      })
      .afterClosed()
      .subscribe(() => {
        this.router.navigate(['/employee/dsr-detail']).then(navigated => {
          if (!navigated) {
            this.router.navigateByUrl('/employee/dsr-detail', { replaceUrl: true });
          }
        });
      });
  }

  onCancel(): void {
    this.buildState();
    Promise.resolve().then(() => {
      this.isReady = true;
      this.cdr.detectChanges();
    });
  }
}