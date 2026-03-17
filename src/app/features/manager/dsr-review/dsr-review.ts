import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  trigger, style, transition, animate,
} from '@angular/animations';

import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatSelectModule }    from '@angular/material/select';
import { MatDatepickerModule }from '@angular/material/datepicker';
import { MatNativeDateModule }from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule }   from '@angular/material/tooltip';
import { TeamMember }         from '../manager';

export interface DsrEntry {
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

@Component({
  selector: 'app-dsr-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './dsr-review.html',
  styleUrl: './dsr-review.css',
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate('340ms cubic-bezier(.4,0,.2,1)',
          style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class DsrReview implements OnInit, OnDestroy {

  member:          TeamMember | null = null;
  allEntries:      DsrEntry[]        = [];
  filteredEntries: DsrEntry[]        = [];
  isLoading        = true;

  private selectedMemberId: string | null = null;

  entryDecisions: Record<string, 'approved' | 'cancelled'> = {};

  filterDate:  Date | null = null;
  filterWeek   = '';
  weekOptions: { value: string; label: string }[] = [];

  // Modal state (kept for template binding compatibility)
  showConfirmModal = false;
  pendingAction:   'approve' | 'cancel' | null = null;
  pendingEntry:    DsrEntry | null = null;

  // The portal element appended directly to document.body
  private _portalEl:   HTMLElement | null = null;
  private _escHandler: ((e: KeyboardEvent) => void) | null = null;

  get selectedWeekLabel(): string { return this.member?.weekKey ?? ''; }

  constructor(
    private route:    ActivatedRoute,
    private router:   Router,
    private snackbar: MatSnackBar,
    private cdr:      ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const raw = localStorage.getItem('mgr_review_member');
    if (raw) {
      try { this.member = JSON.parse(raw); } catch { this.member = null; }
    }
    this.selectedMemberId = this.route.snapshot.paramMap.get('id');
    this.buildWeekOptions();
    this.loadDsrEntries();
    this.loadEntryDecisions();
    this.restoreManagerFilters();
  }

  ngOnDestroy(): void {
    localStorage.removeItem('mgr_active_filters');
    this._teardownPortal();
    this._unlockScroll();
  }

  // ══════════════════════════════════════════════════════
  // BODY-PORTAL MODAL
  // We create a plain DOM element, inject it into document.body,
  // and wire event listeners manually. This completely sidesteps
  // Angular component host stacking contexts, sidebar z-indexes,
  // and any transform/overflow on ancestor elements.
  // ══════════════════════════════════════════════════════

  private _lockScroll(): void {
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow     = 'hidden';
    document.body.style.paddingRight = `${sb}px`;
  }

  private _unlockScroll(): void {
    document.body.style.overflow     = '';
    document.body.style.paddingRight = '';
  }

  private _buildPortalHTML(): string {
    const approve   = this.pendingAction === 'approve';
    const accent    = approve ? '#22c55e' : '#ef4444';
    const accentHov = approve ? '#16a34a' : '#dc2626';
    const iconBg    = approve ? 'rgba(34,197,94,.12)'  : 'rgba(239,68,68,.12)';
    const iconRing  = approve ? 'rgba(34,197,94,.08)'  : 'rgba(239,68,68,.08)';
    const btnShadow = approve ? 'rgba(34,197,94,.35)'  : 'rgba(239,68,68,.35)';
    const icon      = approve ? 'check_circle' : 'cancel';
    const btnIcon   = approve ? 'check'        : 'block';
    const title     = approve ? 'Approve DSR Entry' : 'Cancel DSR Entry';
    const action    = approve ? 'Approved'          : 'Cancelled';
    const btnLabel  = approve ? 'Yes, Approve'      : 'Yes, Cancel';
    const dateStr   = this.pendingEntry?.date
      ? new Date(this.pendingEntry.date).toLocaleDateString('en-US',
          { weekday:'short', month:'short', day:'numeric', year:'numeric' })
      : '';
    const name = this.member?.name ?? '';

    return `
<style>
  #_rv_portal_ {
    position: fixed; inset: 0;
    width: 100vw; height: 100vh;
    background: rgba(15,23,42,.65);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px; box-sizing: border-box;
    z-index: 2147483647;
    font-family: 'Inter';
    /* ✏️ You can increase animation timing from here → backdrop fade-in duration (.22s) */
    animation: _rvBd .22s ease both;
    will-change: opacity;
  }
  @keyframes _rvBd { from{opacity:0} to{opacity:1} }

  #_rv_portal_ * { box-sizing: border-box; }

  #_rv_card_ {
    background: #fff; border-radius: 20px;
    box-shadow: 0 32px 80px rgba(15,23,42,.28), 0 8px 24px rgba(15,23,42,.12);
    padding: 40px 40px 32px; text-align: center;
    width: 100%; max-width: 440px;
    display: flex; flex-direction: column; align-items: center;
    /*You can increase animation timing from here → card pop-in duration (.34s) */
    animation: _rvPop .34s cubic-bezier(.34,1.28,.64,1) both;
    will-change: transform, opacity, box-shadow;
     font-size: 13px;
    letter-spacing: 0.5px;
    font-family: inter;
  }
  @keyframes _rvPop {
    from{opacity:0;transform:scale(.86) translateY(24px)}
    to  {opacity:1;transform:scale(1)   translateY(0)}
  }

  ._rv_icon_ {
    width:64px; height:64px; border-radius:50%;
    background:${iconBg}; box-shadow:0 0 0 10px ${iconRing};
    display:flex; align-items:center; justify-content:center;
    margin-bottom:20px; position:relative;
    will-change: transform, box-shadow;
  }
  ._rv_icon_ .material-icons {
    font-size:36px; color:${accent};
    font-family:'Material Icons'; font-style:normal; line-height:1;
    will-change: opacity, transform;
  }
  ._rv_h2_ { font-size:18px; font-weight:800; color:#111827; margin:0 0 8px; }
  ._rv_p_  { font-size:13px; color:#374151; line-height:1.65; margin:0 0 10px; }
  ._rv_sub_ {
    font-size:12px; color:#6b7280; line-height:1.6; margin:0 0 32px;
    width:100%; padding:12px 16px;
    background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;
  }
  ._rv_sub_ strong { color:#111827; font-weight:700; }
  ._rv_acts_ { display:flex; gap:10px; width:100%; }
  ._rv_btn_ {
    display:inline-flex; align-items:center; justify-content:center; gap:6px;
    padding:11px 16px; border-radius:10px;
    font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
    border:none; outline:none; flex:1; max-width:150px; letter-spacing:.3px;
    transition:background .18s,box-shadow .18s,transform .14s;
  }
  ._rv_btn_ .material-icons {
    font-size:16px; font-family:'Material Icons'; font-style:normal; line-height:1;
  }
  ._rv_btn_:active{transform:scale(.97);}
  #_rv_no_  { background:#f1f5f9; color:#475569; border:1.5px solid #e2e8f0 !important; }
  #_rv_no_:hover { background:#e2e8f0; }
  #_rv_yes_ { background:${accent}; color:#fff; box-shadow:0 4px 14px ${btnShadow}; }
  #_rv_yes_:hover { background:${accentHov}; box-shadow:0 6px 18px ${btnShadow}; transform:translateY(-1px); }

  @media(max-width:480px){
    #_rv_card_{ padding:28px 20px 24px; }
    ._rv_acts_{ flex-direction:column; }
    ._rv_btn_ { max-width:100%; }
  }
</style>
<div id="_rv_portal_" data-backdrop>
  <div id="_rv_card_">
    <div class="_rv_icon_"><span class="material-icons">${icon}</span></div>
    <h2 class="_rv_h2_">${title}</h2>
    <p class="_rv_p_">Are you sure you want to proceed with this action?</p>
    <p class="_rv_sub_">
      This will mark the DSR entry dated <strong>${dateStr}</strong>
      for <strong>${name}</strong> as <strong>${action}</strong>.
    </p>
    <div class="_rv_acts_">
      <button id="_rv_no_"  class="_rv_btn_" data-close>
        <span class="material-icons">close</span>No
      </button>
      <button id="_rv_yes_" class="_rv_btn_" data-confirm>
        <span class="material-icons">${btnIcon}</span>${btnLabel}
      </button>
    </div>
  </div>
</div>`;
  }

  private _injectPortal(): void {
    this._teardownPortal();

    const el = document.createElement('div');
    el.id = 'rv-modal-portal-root';
    el.innerHTML = this._buildPortalHTML();
    document.body.appendChild(el);
    this._portalEl = el;

    // Backdrop click (only when clicking the dark area, not the card)
    el.querySelector('[data-backdrop]')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).dataset['backdrop'] !== undefined) this.closeModal();
    });
    el.querySelector('[data-close]')?.addEventListener('click',   () => this.closeModal());
    el.querySelector('[data-confirm]')?.addEventListener('click', () => this.confirmAction());

    this._escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') this.closeModal(); };
    document.addEventListener('keydown', this._escHandler);
  }

  private _teardownPortal(): void {
    this._portalEl?.remove();
    this._portalEl = null;
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  }

  /** Smooth dismiss: card shrinks + fades, backdrop fades. Then tears down the portal. */
  private _animateDismiss(then?: () => void): void {
    const backdrop = this._portalEl?.querySelector<HTMLElement>('#_rv_portal_');
    const card     = this._portalEl?.querySelector<HTMLElement>('#_rv_card_');
    if (!backdrop || !card) { this._teardownPortal(); then?.(); return; }

    // ✏️ You can increase animation timing from here → dismiss card exit duration (230ms)
    card.style.transition     = 'opacity 230ms cubic-bezier(.4,0,1,1), transform 230ms cubic-bezier(.4,0,1,1)';
    card.style.opacity        = '0';
    card.style.transform      = 'scale(0.88) translateY(12px)';
    // ✏️ You can increase animation timing from here → dismiss backdrop fade duration (280ms)
    backdrop.style.transition = 'opacity 280ms ease';
    backdrop.style.opacity    = '0';

    setTimeout(() => { this._teardownPortal(); then?.(); }, 290);
  }

  /**
   * Enhanced approve animation — 4 phases:
   *   1. Button press micro-feedback        (0 → 150ms)
   *   2. Burst: rings, icon pop, tick, text (150ms, CSS keyframes from dsr-review.css)
   *   3. Hold success state                 (until 900ms approve / 640ms cancel)
   *   4. Collapse glow → _animateDismiss    (~1200ms total)
   */
  private _animateConfirmThenClose(action: 'approve' | 'cancel', then: () => void): void {
    const card     = this._portalEl?.querySelector<HTMLElement>('#_rv_card_');
    const yesBtn   = this._portalEl?.querySelector<HTMLElement>('#_rv_yes_');
    const noBtn    = this._portalEl?.querySelector<HTMLElement>('#_rv_no_');
    const iconEl   = this._portalEl?.querySelector<HTMLElement>('._rv_icon_');
    const iconSpan = this._portalEl?.querySelector<HTMLElement>('._rv_icon_ .material-icons');
    const titleEl  = this._portalEl?.querySelector<HTMLElement>('._rv_h2_');
    const actions  = this._portalEl?.querySelector<HTMLElement>('._rv_acts_');
    const bodyEl   = this._portalEl?.querySelector<HTMLElement>('._rv_p_');
    const subEl    = this._portalEl?.querySelector<HTMLElement>('._rv_sub_');

    if (!card) { then(); return; }

    const isApprove = action === 'approve';
    const accent    = isApprove ? '#22c55e' : '#ef4444';
    const rippleBg  = isApprove ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.18)';

    // ── Phase 1: Button press micro-feedback ─────────────────────────────
    if (yesBtn) {
      // ✏️ You can increase animation timing from here → button press scale duration (130ms)
      yesBtn.style.transition = 'transform 130ms cubic-bezier(.4,0,.2,1), box-shadow 130ms';
      yesBtn.style.transform  = 'scale(0.92)';
      yesBtn.style.boxShadow  = 'none';
    }

    // ── Phase 2: Burst into success / cancel state ───────────────────────
    // ✏️ You can increase animation timing from here → delay before phase 2 fires (150ms)
    setTimeout(() => {

      // Lock buttons to prevent double-fire
      if (yesBtn) { yesBtn.style.pointerEvents = 'none'; yesBtn.style.transform = 'scale(1)'; }
      if (noBtn)  { noBtn.style.pointerEvents  = 'none'; }

      // ✏️ You can increase animation timing from here → action row / body fade-out (180ms)
      if (actions) { actions.style.transition = 'opacity 180ms ease'; actions.style.opacity = '0'; }
      if (bodyEl)  { bodyEl.style.transition  = 'opacity 180ms ease'; bodyEl.style.opacity  = '0'; }
      // subEl (the "This will mark..." detail box) stays visible — no fade

      if (isApprove) {
        // Card glow pulse — CSS keyframe rvGlowPulse (defined in dsr-review.css)
        card.classList.add('--approving');

        if (iconEl) {
          // 3 concentric pulse rings — CSS keyframe rvRingOut (dsr-review.css)
          for (let i = 0; i < 3; i++) {
            const ring = document.createElement('span');
            ring.className        = '_rv_ripple_ring_';
            ring.style.animationDelay = `${i * 130}ms`;
            iconEl.appendChild(ring);
          }
          // Icon spring-pop — CSS keyframe rvCheckPop (dsr-review.css)
          iconEl.classList.add('--approving');
        }

        // Glyph swap: fade out → swap to check_circle → fade in with spring
        if (iconSpan) {
          // ✏️ You can increase animation timing from here → glyph fade-out duration (120ms)
          iconSpan.style.transition = 'opacity 120ms ease, transform 120ms ease';
          iconSpan.style.opacity    = '0';
          iconSpan.style.transform  = 'scale(0.5)';
          setTimeout(() => {
            if (!iconSpan) return;
            iconSpan.textContent = 'check_circle';
            iconSpan.style.color = '#22c55e';
            // ✏️ You can increase animation timing from here → glyph fade-in duration (200ms)
            iconSpan.style.transition = 'opacity 200ms ease, transform 200ms cubic-bezier(.34,1.4,.64,1)';
            iconSpan.style.opacity    = '1';
            iconSpan.style.transform  = 'scale(1)';
          }, 130);
        }

        // Title cross-fade to success message
        if (titleEl) {
          // ✏️ You can increase animation timing from here → title fade-out (160ms)
          titleEl.style.transition = 'opacity 160ms ease, color 160ms ease';
          titleEl.style.opacity    = '0';
          setTimeout(() => {
            if (!titleEl) return;
            titleEl.textContent      = 'Entry Approved!';
            titleEl.style.color      = '#15803d';
            titleEl.style.fontWeight = '900';
            // ✏️ You can increase animation timing from here → title fade-in (240ms)
            titleEl.style.transition = 'opacity 240ms ease';
            titleEl.style.opacity    = '1';
            // Success message slides up — CSS keyframe rvSubIn (dsr-review.css)
            const sub = document.createElement('p');
            sub.className   = '_rv_success_msg_';
            sub.textContent = 'DSR entry has been successfully approved ✓';
            titleEl.insertAdjacentElement('afterend', sub);
          }, 170);
        }

      } else {
        // ── CANCEL PATH — simpler ripple + title swap ─────────────────────
        void card.offsetWidth; // force reflow before transition
        // ✏️ You can increase animation timing from here → cancel ripple expansion (420ms)
        card.style.transition = 'box-shadow 420ms cubic-bezier(.4,0,.2,1)';
        card.style.boxShadow  = `0 0 0 22px ${rippleBg}, 0 32px 80px rgba(15,23,42,.22)`;

        if (iconEl) {
          iconEl.style.transition = 'transform 300ms cubic-bezier(.34,1.4,.64,1), box-shadow 300ms';
          iconEl.style.transform  = 'scale(1.18)';
          iconEl.style.boxShadow  = `0 0 0 12px ${rippleBg}`;
        }
        if (titleEl) {
          titleEl.style.transition = 'opacity 150ms ease';
          titleEl.style.opacity    = '0';
          setTimeout(() => {
            if (!titleEl) return;
            titleEl.textContent      = 'Entry Cancelled';
            titleEl.style.color      = accent;
            titleEl.style.transition = 'opacity 200ms ease';
            titleEl.style.opacity    = '1';
          }, 160);
        }
      }

    }, 150);

    // ── Phase 3 / 4: Hold → collapse glow → dismiss ──────────────────────
    //  increase animation timing from here → hold duration (approve: 900ms | cancel: 640ms)
    const holdMs = isApprove ? 2250000 : 640;
    setTimeout(() => {
      if (iconEl) {
        iconEl.style.transition = 'transform 220ms ease, box-shadow 220ms ease';
        iconEl.style.transform  = 'scale(1)';
        iconEl.style.boxShadow  = '';
      }
      if (card) {
        card.style.transition = 'box-shadow 220ms ease';
        card.style.boxShadow  = '';
        card.classList.remove('--approving');
      }
      //  increase animation timing from here → pause before final dismiss (140ms)
      setTimeout(() => this._animateDismiss(then), 140);
    }, holdMs);
  }

  // ── Per-card decision handler ────────────────────────────
  onCardDecision(entry: DsrEntry, action: 'approve' | 'cancel'): void {
    this.pendingEntry     = entry;
    this.pendingAction    = action;
    this.showConfirmModal = true;
    this._lockScroll();
    this._injectPortal();
  }

  // ── Modal close ──────────────────────────────────────────
  closeModal(): void {
    this.showConfirmModal = false;
    this._animateDismiss(() => {
      this.pendingAction = null;
      this.pendingEntry  = null;
      this._unlockScroll();
    });
  }

  // ── Confirm action ───────────────────────────────────────
  confirmAction(): void {
    if (!this.member || !this.pendingAction || !this.pendingEntry) return;

    const entryId       = this.pendingEntry.id;
    const pendingAction = this.pendingAction;               // capture before async
    const pendingEntry  = this.pendingEntry;
    const decision      = pendingAction === 'approve' ? 'approved' : 'cancelled';

    this.entryDecisions[entryId] = decision;
    this.saveEntryDecisions();

    const allDecisions = Object.values(this.entryDecisions);
    let overallStatus: 'approved' | 'cancelled' | 'pending' = 'pending';
    if (allDecisions.some(d => d === 'approved')) {
      overallStatus = 'approved';
    } else if (
      this.allEntries.length > 0 &&
      this.allEntries.every(e => this.entryDecisions[e.id] === 'cancelled')
    ) {
      overallStatus = 'cancelled';
    }

    const approvals: Record<string, string> = JSON.parse(
      localStorage.getItem('ng_approvals') || '{}'
    );
    const wk = this.weekKeyFromLabel(this.member.weekKey)
             ?? this.fmtKey(this.weekStart(new Date()));

    approvals[`${wk}_${this.member.id}`]            = overallStatus;
    approvals[`entry_${this.member.id}_${entryId}`] = decision;
    localStorage.setItem('ng_approvals', JSON.stringify(approvals));

    const label = decision === 'approved' ? 'Approved ✅' : 'Cancelled ❌';
    const snackMsg = `Entry for ${pendingEntry.date.toLocaleDateString('en-US',
      { month: 'short', day: 'numeric' })} has been ${label}`;
    const snackClass = decision === 'approved' ? ['snack-success'] : ['snack-warn'];

    // Play confirm animation, then close
    this._animateConfirmThenClose(pendingAction, () => {
      this.showConfirmModal = false;
      this.pendingAction    = null;
      this.pendingEntry     = null;
      this._unlockScroll();
      this.snackbar.open(snackMsg, 'Close', { duration: 3000, panelClass: snackClass });
      this.cdr.detectChanges();
    });
  }

  // ── Restore filters ──────────────────────────────────────
  private restoreManagerFilters(): void {
    const raw = localStorage.getItem('mgr_active_filters');
    if (!raw) return;
    try {
      const f = JSON.parse(raw);
      if (f.date) {
        const [y, m, d] = (f.date as string).split('-').map(Number);
        this.filterDate = new Date(y, m - 1, d);
      }
      if (f.week) { this.filterWeek = f.week; }
    } catch { /* ignore */ }
  }

  private loadEntryDecisions(): void {
    if (!this.member) return;
    const key = `ng_entry_decisions_${this.member.id}`;
    const raw = localStorage.getItem(key);
    if (raw) { try { this.entryDecisions = JSON.parse(raw); } catch { this.entryDecisions = {}; } }
  }

  private saveEntryDecisions(): void {
    if (!this.member) return;
    localStorage.setItem(`ng_entry_decisions_${this.member.id}`, JSON.stringify(this.entryDecisions));
  }

  getEntryDecision(entryId: string): 'approved' | 'cancelled' | null {
    return this.entryDecisions[entryId] ?? null;
  }

  getCardStatusClass(entryId: string): string {
    const d = this.getEntryDecision(entryId);
    if (d === 'approved')  return 'rv-dsr-card--approved';
    if (d === 'cancelled') return 'rv-dsr-card--cancelled';
    return '';
  }

  private buildWeekOptions(): void {
    const now = new Date();
    this.weekOptions = [{ value: '', label: 'All Weeks' }];
    const humanLabels = ['This Week','Last Week','Week 1','Week 2','Week 3','Week 4'];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const ws = this.weekStart(d);
      this.weekOptions.push({ value: this.fmtKey(ws), label: humanLabels[i] });
    }
  }

  private loadDsrEntries(): void {
    this.isLoading = true;
    const stored: DsrEntry[] = [];
    const raw = localStorage.getItem('ng_dsr_entries');
    if (raw) {
      try {
        (JSON.parse(raw) as any[]).forEach(e =>
          stored.push({ ...e, date: new Date(e.date), submittedAt: new Date(e.submittedAt) }));
      } catch { /* ignore */ }
    }

    const memberEntry = this.buildMemberEntry();
    const merged = [...stored, ...(memberEntry ? [memberEntry] : [])];
    const seen = new Set<string>();
    let allEntries = merged.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });

    if (this.selectedMemberId) {
      const mid = this.selectedMemberId;
      allEntries = allEntries.filter(e => e.id === `member-${mid}` || e.id.startsWith(`${mid}-`));
      if (allEntries.length === 0 && memberEntry) allEntries = [memberEntry];
    }

    this.allEntries = allEntries;
    setTimeout(() => { this.isLoading = false; this.applyFilters(); this.cdr.detectChanges(); }, 450);
  }

  private buildMemberEntry(): DsrEntry | null {
    if (!this.member || !this.selectedMemberId) return null;
    const rawDate = (this.member as any).date;
    const memberDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (isNaN(memberDate.getTime())) return null;
    const idx = parseInt(this.selectedMemberId, 10) - 1;
    return {
      id: `member-${this.selectedMemberId}`,
      date: memberDate,
      client:  ['Acme Corp','Beta Solutions','Gamma Inc'][idx % 3],
      project: ['Website Redesign','Mobile App','API Integration'][idx % 3],
      taskStatus: (idx % 5 === 3 ? 'at_risk' : 'on_track') as 'on_track' | 'at_risk',
      atRiskDescription: idx % 5 === 3 ? 'Waiting on client approval for design changes' : undefined,
      timeByCategory: {
        development:      idx % 2 === 0 ? 4 : 3,
        internal_meeting: 1,
        client_meeting:   idx % 3 === 0 ? 1 : 0,
        training:         idx % 4 === 0 ? 1 : 0,
        idle_time:        idx % 2 === 0 ? 2 : 4,
      },
      totalHours: 8,
      blockers: idx % 5 === 1 ? 'API documentation not yet delivered by client.' : undefined,
      submittedAt: memberDate,
      weekKey: this.fmtKey(this.weekStart(memberDate)),
    };
  }

  applyFilters(): void {
    this.filteredEntries = this.allEntries.filter(e => {
      const dateMatch = !this.filterDate || this.fmtKey(e.date) === this.fmtKey(this.filterDate!);
      const weekMatch = !this.filterWeek || e.weekKey === this.filterWeek;
      return dateMatch && weekMatch;
    });
  }

  clearFilters(): void { this.filterDate = null; this.filterWeek = ''; this.applyFilters(); }

  getCategoryEntries(entry: DsrEntry): { key: string; label: string; icon: string; color: string; hours: number }[] {
    return Object.keys(entry.timeByCategory).map(key => ({
      key,
      ...(CAT_META[key] ?? { label: key, icon: 'schedule', color: '#6b7280' }),
      hours: entry.timeByCategory[key] ?? 0,
    }));
  }

  goBack(): void { this.router.navigate(['/manager']); }

  fmtKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  weekStart(d: Date): Date {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    dt.setDate(dt.getDate() + (dt.getDay() === 0 ? -6 : 1 - dt.getDay()));
    return dt;
  }

  private weekKeyFromLabel(label: string): string | null {
    return this.weekOptions.find(w => w.label === label)?.value ?? null;
  }
}