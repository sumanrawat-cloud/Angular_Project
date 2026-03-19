import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ChangeDetectorRef,
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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule }   from '@angular/material/divider';

import { DsrDataService, DsrTimeCategory } from '../../../core/services/dsr-data-service';
import { ConfirmSubmitDialog } from '../../../shared/confirm-submit-dialog/confirm-submit-dialog';
import { SubmitSuccessDialog } from '../../../shared/submit-success-dialog/submit-success-dialog';

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
      .open(ConfirmSubmitDialog, {
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
      .open(SubmitSuccessDialog, {
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