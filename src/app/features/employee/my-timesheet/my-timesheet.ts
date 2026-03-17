import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef,
  ChangeDetectionStrategy, ViewEncapsulation, TemplateRef, ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  trigger, style, transition, animate, keyframes, query, stagger,
} from '@angular/animations';

import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal }                      from '@angular/cdk/portal';

import { MatIconModule }    from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../core/auth/auth.service';

// ─── DSR Entry ───────────────────────────────────────────────────────────────
export interface EmpDsrEntry {
  id:                 string;
  date:               Date;
  client:             string;
  project:            string;
  taskStatus:         'on_track' | 'at_risk';
  atRiskDescription?: string;
  timeByCategory:     Record<string, number>;
  totalHours:         number;
  blockers?:          string;
  submittedAt:        Date;
  weekKey:            string;
}

const CAT_META: Record<string, { label: string; icon: string; color: string }> = {
  development:      { label: 'Development',      icon: 'code',         color: '#3b82f6' },
  internal_meeting: { label: 'Internal Meeting', icon: 'groups',       color: '#a855f7' },
  client_meeting:   { label: 'Client Meeting',   icon: 'handshake',    color: '#f97316' },
  training:         { label: 'Training',         icon: 'school',       color: '#06b6d4' },
  idle_time:        { label: 'Idle Time',        icon: 'pause_circle', color: '#6b7280' },
};

export type ApprovalStatus = 'approved' | 'cancelled' | 'pending';

export interface DsrWithStatus extends EmpDsrEntry {
  approvalStatus: ApprovalStatus;
  employeeComment?: string;
}

@Component({
  selector: 'app-my-timesheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    OverlayModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './my-timesheet.html',
  styleUrl: './my-timesheet.css',
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('420ms cubic-bezier(.4,0,.2,1)',
          style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('listStagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(18px)' }),
          stagger(60, [
            animate('350ms cubic-bezier(.34,1.1,.64,1)',
              style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, height: 0, overflow: 'hidden' }),
        animate('250ms ease-out', style({ opacity: 1, height: '*' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, height: 0, overflow: 'hidden' })),
      ]),
    ]),
  ],
})
export class MyTimesheet implements OnInit, OnDestroy {

  @ViewChild('commentModalTpl', { static: true })
  commentModalTpl!: TemplateRef<unknown>;

  employeeName  = '';
  employeeRole  = '';
  employeeId    = 'emp_1';
  isLoading     = true;

  allEntries:      DsrWithStatus[] = [];
  filteredEntries: DsrWithStatus[] = [];
  filterStatus: ApprovalStatus | '' = '';
  stats = { total: 0, approved: 0, pending: 0, cancelled: 0 };

  showCommentModal  = false;
  commentEntry:     DsrWithStatus | null = null;
  commentText       = '';
  existingComment   = '';

  expandedCards = new Set<string>();

  private overlayRef: OverlayRef | null = null;

  get hasActiveFilter(): boolean { return this.filterStatus !== ''; }

  constructor(
    private authService: AuthService,
    private cdr:         ChangeDetectorRef,
    private el:          ElementRef,
    private snackbar:    MatSnackBar,
    private router:      Router,
    private overlay:     Overlay,
    private vcr:         ViewContainerRef,
  ) {}

  ngOnInit(): void {
    try {
      const profile      = this.authService.getProfile();
      this.employeeName  = profile?.name ?? 'Employee';
      this.employeeRole  = profile?.role ?? 'Employee';
      this.employeeId    = profile?.['id']   ?? 'emp_1';
    } catch {
      try {
        const raw = localStorage.getItem('mgr_review_member');
        if (raw) {
          const m = JSON.parse(raw);
          this.employeeName = m.name ?? 'Employee';
          this.employeeRole = m.role ?? 'Employee';
          this.employeeId   = m.id   ?? 'emp_1';
        }
      } catch { /* use defaults */ }
    }
    this.loadEntries();
  }

  ngOnDestroy(): void { this._disposeOverlay(); }

  loadEntries(): void {
    this.isLoading = true;

    const stored: EmpDsrEntry[] = [];
    const raw = localStorage.getItem('ng_dsr_entries');
    if (raw) {
      try {
        (JSON.parse(raw) as any[]).forEach(e =>
          stored.push({ ...e, date: new Date(e.date), submittedAt: new Date(e.submittedAt) })
        );
      } catch { /* ignore */ }
    }

    const demo   = this.buildDemoEntries();
    const merged = [...stored, ...demo];
    const seen   = new Set<string>();
    const unique = merged.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });

    const decisions = this.loadDecisions();
    const comments  = this.loadComments();

    this.allEntries = unique.map(e => ({
      ...e,
      approvalStatus:  decisions[e.id] ?? 'pending',
      employeeComment: comments[e.id]  ?? undefined,
    }));

    this.computeStats();
    setTimeout(() => { this.isLoading = false; this.applyFilter(); this.cdr.detectChanges(); }, 400);
  }

  private loadDecisions(): Record<string, 'approved' | 'cancelled'> {
    const result: Record<string, 'approved' | 'cancelled'> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('ng_entry_decisions_')) {
        try { Object.assign(result, JSON.parse(localStorage.getItem(key) ?? '{}')); } catch { /* ignore */ }
      }
    }
    return result;
  }

  private loadComments(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem('ng_emp_comments') ?? '{}'); } catch { return {}; }
  }

  private saveComments(c: Record<string, string>): void {
    try { localStorage.setItem('ng_emp_comments', JSON.stringify(c)); } catch { /* ignore */ }
  }

  private computeStats(): void {
    this.stats = { total: 0, approved: 0, pending: 0, cancelled: 0 };
    this.allEntries.forEach(e => { this.stats.total++; this.stats[e.approvalStatus]++; });
  }

  applyFilter(): void {
    this.filteredEntries = this.filterStatus
      ? this.allEntries.filter(e => e.approvalStatus === this.filterStatus)
      : [...this.allEntries];
  }

  setFilter(status: ApprovalStatus | ''): void { this.filterStatus = status; this.applyFilter(); }
  clearFilter(): void { this.filterStatus = ''; this.applyFilter(); }

  toggleExpand(id: string): void {
    if (this.expandedCards.has(id)) this.expandedCards.delete(id);
    else this.expandedCards.add(id);
  }
  isExpanded(id: string): boolean { return this.expandedCards.has(id); }

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL — uses Angular CDK Overlay (same as MatDialog internally).
  // The CDK appends its overlay container as a direct child of <body>,
  // completely outside mat-sidenav, mat-toolbar, and every stacking context.
  // No DOM teleport, no z-index hacking required.
  // ─────────────────────────────────────────────────────────────────────────
  openCommentModal(entry: DsrWithStatus): void {
    if (this.overlayRef) return;

    this.commentEntry     = entry;
    this.existingComment  = entry.employeeComment ?? '';
    this.commentText      = entry.employeeComment ?? '';
    this.showCommentModal = true;
    this.cdr.detectChanges();

    this.overlayRef = this.overlay.create({
      hasBackdrop:      true,
      backdropClass:    'dsr-overlay-backdrop',
      panelClass:       'dsr-overlay-panel',
      scrollStrategy:   this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position().global()
                          .centerHorizontally()
                          .centerVertically(),
    });

    this.overlayRef.attach(new TemplatePortal(this.commentModalTpl, this.vcr));
    this.overlayRef.backdropClick().subscribe(() => this.closeCommentModal());
  }

  closeCommentModal(): void {
    this._disposeOverlay();
    this.showCommentModal = false;
    this.commentEntry     = null;
    this.commentText      = '';
    this.cdr.detectChanges();
  }

  private _disposeOverlay(): void {
    if (this.overlayRef) { this.overlayRef.dispose(); this.overlayRef = null; }
  }

  submitComment(): void {
    if (!this.commentEntry || !this.commentText.trim()) return;

    const comments = this.loadComments();
    comments[this.commentEntry.id] = this.commentText.trim();
    this.saveComments(comments);

    const entry = this.allEntries.find(e => e.id === this.commentEntry!.id);
    if (entry) entry.employeeComment = this.commentText.trim();
    const filtered = this.filteredEntries.find(e => e.id === this.commentEntry!.id);
    if (filtered) filtered.employeeComment = this.commentText.trim();

    this.snackbar.open('💬 Comment submitted — manager has been notified.', 'Close', {
      duration: 3500, panelClass: ['snack-success'],
    });

    this.closeCommentModal();
    this.cdr.detectChanges();
  }

  getCategoryEntries(entry: EmpDsrEntry): { key: string; label: string; icon: string; color: string; hours: number }[] {
    return Object.keys(entry.timeByCategory)
      .map(key => ({ key, ...(CAT_META[key] ?? { label: key, icon: 'schedule', color: '#6b7280' }), hours: entry.timeByCategory[key] ?? 0 }))
      .filter(c => c.hours > 0);
  }

  getStatusConfig(status: ApprovalStatus): { label: string; icon: string; cssClass: string } {
    switch (status) {
      case 'approved':  return { label: 'Approved',  icon: 'check_circle',  cssClass: 'emp-status--approved'  };
      case 'cancelled': return { label: 'Cancelled', icon: 'cancel',        cssClass: 'emp-status--cancelled' };
      default:          return { label: 'Pending',   icon: 'hourglass_top', cssClass: 'emp-status--pending'   };
    }
  }

  getCardClass(status: ApprovalStatus): string {
    switch (status) {
      case 'approved':  return 'emp-card--approved';
      case 'cancelled': return 'emp-card--cancelled';
      default:          return 'emp-card--pending';
    }
  }

  trackById(_: number, e: DsrWithStatus): string { return e.id; }
  goToDashboard(): void { this.router.navigate(['/dashboard']); }

  private buildDemoEntries(): EmpDsrEntry[] {
    const base = new Date(); base.setHours(0, 0, 0, 0);
    const regularDays   = [-13, -12, -11, -10, -9, -6, -5, -4, -3, -2, -1, 0];
    const cancelledDays = [-15, -14, -8, -7];

    const regularEntries: EmpDsrEntry[] = regularDays.map((offset, i) => {
      const d = new Date(base); d.setDate(d.getDate() + offset);
      return {
        id: `demo-${i}`, date: d,
        client:  ['Acme Corp', 'Beta Solutions', 'Gamma Inc'][i % 3],
        project: ['Website Redesign', 'Mobile App', 'API Integration'][i % 3],
        taskStatus: (i % 5 === 3 ? 'at_risk' : 'on_track') as 'on_track' | 'at_risk',
        atRiskDescription: i % 5 === 3 ? 'Waiting on client approval for design changes' : undefined,
        timeByCategory: {
          development: i % 2 === 0 ? 4 : 3, internal_meeting: 1,
          client_meeting: i % 3 === 0 ? 1 : 0, training: i % 4 === 0 ? 1 : 0,
          idle_time: i % 2 === 0 ? 2 : 4,
        },
        totalHours: 8,
        blockers: i % 5 === 1 ? 'API documentation not yet delivered by client.' : undefined,
        submittedAt: d, weekKey: this.fmtKey(this.weekStart(d)),
      } as EmpDsrEntry;
    });

    const reasons = [
      'Hours reported exceeded project budget allocation',
      'Duplicate entry — already submitted for this date',
      'Client project was put on hold; DSR not required',
      'Missing task category breakdown — resubmission needed',
    ];

    const cancelledEntries: EmpDsrEntry[] = cancelledDays.map((offset, i) => {
      const d = new Date(base); d.setDate(d.getDate() + offset);
      return {
        id: `demo-cancelled-${i}`, date: d,
        client:  ['Acme Corp', 'Beta Solutions', 'Gamma Inc', 'Delta Tech'][i],
        project: ['Website Redesign', 'Mobile App', 'API Integration', 'Data Pipeline'][i],
        taskStatus: 'on_track' as 'on_track',
        timeByCategory: {
          development: 3, internal_meeting: 1,
          client_meeting: i % 2 === 0 ? 1 : 0, training: 0,
          idle_time: i % 2 === 0 ? 3 : 4,
        },
        totalHours: 8, blockers: reasons[i],
        submittedAt: d, weekKey: this.fmtKey(this.weekStart(d)),
      } as EmpDsrEntry;
    });

    this.seedCancelledDecisions(cancelledEntries.map(e => e.id));
    return [...regularEntries, ...cancelledEntries];
  }

  private seedCancelledDecisions(ids: string[]): void {
    const key = 'ng_entry_decisions_demo';
    try {
      const existing: Record<string, string> = JSON.parse(localStorage.getItem(key) ?? '{}');
      ids.forEach(id => { existing[id] = 'cancelled'; });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch { /* ignore */ }
  }

  private fmtKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private weekStart(d: Date): Date {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -6 : 1 - dt.getDay()));
    return dt;
  }
}