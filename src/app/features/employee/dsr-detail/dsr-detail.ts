import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MatCardModule }    from '@angular/material/card';
import { MatButtonModule }  from '@angular/material/button';
import { MatIconModule }    from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog, MatDialogRef } from '@angular/material/dialog';

import { DsrDataService, DsrPayload, DsrTimeCategory } from '../../../core/services/dsr-data-service';

/* ─── Approve DSR Dialog ────────────────────────────────────── */
@Component({
  selector: 'app-approve-dsr-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <!-- Confetti canvas (sits behind dialog content) -->
    <canvas #confettiCanvas class="apd-confetti-canvas"></canvas>

    <div class="apd-wrap" [class.apd-wrap--shake]="isShaking" [class.apd-wrap--exit]="isExiting">

      <!-- ── Header ──────────────────────────────────────────── -->
      <div class="apd-header" [class.apd-header--hidden]="approveState === 'done'">
        <div class="apd-header-icon" [class.apd-header-icon--pulse]="approveState === 'loading'">
          <mat-icon>how_to_reg</mat-icon>
        </div>
        <h2 class="apd-title">Approve DSR Entry</h2>
        <p class="apd-subtitle">This will mark the DSR as approved and notify the employee.</p>
      </div>

      <!-- ── Success Overlay ─────────────────────────────────── -->
      <div class="apd-success-overlay" [class.apd-success-overlay--visible]="approveState === 'done'">

        <!-- Ripple rings behind checkmark -->
        <div class="apd-ripple-wrap">
          <span class="apd-ripple apd-ripple--1"></span>
          <span class="apd-ripple apd-ripple--2"></span>
          <span class="apd-ripple apd-ripple--3"></span>

          <!-- Animated checkmark SVG -->
          <div class="apd-success-ring">
            <svg class="apd-checkmark" viewBox="0 0 52 52">
              <circle class="apd-checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path   class="apd-checkmark__check"  fill="none" d="M14 27l8 8 16-16"/>
            </svg>
          </div>
        </div>

        <p class="apd-success-text">DSR Approved!</p>
        <p class="apd-success-sub">Employee will be notified shortly.</p>
      </div>

      <!-- ── Actions ─────────────────────────────────────────── -->
      <div class="apd-actions" [class.apd-actions--hidden]="approveState === 'done'">
        <button
          class="apd-btn apd-btn--cancel"
          [disabled]="approveState === 'loading'"
          (click)="onCancel()">
          Cancel
        </button>
        <button
          class="apd-btn apd-btn--approve"
          [class.apd-btn--loading]="approveState === 'loading'"
          [disabled]="approveState !== 'idle'"
          (click)="onApprove()">
          <span class="apd-btn-content" *ngIf="approveState === 'idle'">
            <mat-icon>check_circle</mat-icon> Approve
          </span>
          <span class="apd-dots" *ngIf="approveState === 'loading'">
            <span></span><span></span><span></span>
          </span>
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* ── Canvas ── */
    .apd-confetti-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
      border-radius: 12px;
    }

    /* ── Wrapper ── */
    .apd-wrap {
      padding: 32px 28px 28px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      text-align: center;
      position: relative;
      min-height: 240px;
      overflow: hidden;
      box-sizing: border-box;
      border-radius: 12px;
      /* Smooth entry */
      animation: apd-modal-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    @keyframes apd-modal-in {
      from { opacity: 0; transform: scale(0.88) translateY(12px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* Shake on cancel */
    .apd-wrap--shake {
      animation: apd-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    @keyframes apd-shake {
      0%,100% { transform: translateX(0); }
      15%      { transform: translateX(-7px) rotate(-0.5deg); }
      30%      { transform: translateX(6px)  rotate(0.5deg); }
      45%      { transform: translateX(-5px) rotate(-0.3deg); }
      60%      { transform: translateX(4px)  rotate(0.3deg); }
      75%      { transform: translateX(-2px); }
    }

    /* Exit slide-down on cancel */
    .apd-wrap--exit {
      animation: apd-exit 0.38s cubic-bezier(0.55, 0, 1, 0.45) forwards;
    }
    @keyframes apd-exit {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to   { opacity: 0; transform: scale(0.93) translateY(20px); }
    }

    /* ── Header ── */
    .apd-header {
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    .apd-header--hidden {
      opacity: 0;
      transform: translateY(-12px);
      pointer-events: none;
    }

    .apd-header-icon {
      width: 52px; height: 52px;
      border-radius: 50%;
      background: #eef0f7;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 0 0 8px rgba(64,81,137,.07);
      transition: transform 0.3s ease, background 0.3s ease;
    }
    .apd-header-icon mat-icon {
      font-size: 26px; height: 26px; width: 26px; color: #405189;
      transition: color 0.3s ease;
    }
    /* Pulsing ring while loading */
    .apd-header-icon--pulse {
      animation: apd-icon-pulse 1.2s ease-in-out infinite;
    }
    @keyframes apd-icon-pulse {
      0%, 100% { box-shadow: 0 0 0 8px rgba(64,81,137,.07); }
      50%      { box-shadow: 0 0 0 14px rgba(64,81,137,.14); }
    }

    .apd-title    { font-size: 15px; font-weight: 700; color: #12141f; margin: 0 0 8px; }
    .apd-subtitle { font-size: 12px; color: #878a99; margin: 0 0 24px; line-height: 1.6; }

    /* ── Actions ── */
    .apd-actions {
      display: flex; justify-content: center; gap: 12px;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .apd-actions--hidden {
      opacity: 0; pointer-events: none; transform: translateY(10px);
    }

    .apd-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 9px 22px; border-radius: 8px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      border: none; outline: none;
      transition: background 0.2s, box-shadow 0.2s, transform 0.15s, opacity 0.2s;
    }
    .apd-btn:active:not(:disabled) { transform: scale(.96); }

    /* Cancel button */
    .apd-btn--cancel {
      background: #f3f6f9; color: #6c757d;
      border: 1px solid #e9ebec;
    }
    .apd-btn--cancel:hover:not(:disabled) {
      background: #e9ebec; color: #495057;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0,0,0,.08);
    }
    .apd-btn--cancel:disabled { opacity: 0.45; cursor: not-allowed; }

    /* Approve button */
    .apd-btn--approve {
      background: #405189; color: #fff; min-width: 118px;
      box-shadow: 0 3px 12px rgba(64,81,137,.28);
      justify-content: center;
    }
    .apd-btn--approve:hover:not(:disabled) {
      background: #364474;
      box-shadow: 0 6px 20px rgba(64,81,137,.38);
      transform: translateY(-1px);
    }
    .apd-btn--approve:disabled { cursor: not-allowed; }
    .apd-btn--loading { background: #364474 !important; }

    .apd-btn-content { display: inline-flex; align-items: center; gap: 6px; }
    .apd-btn-content mat-icon { font-size: 16px; height: 16px; width: 16px; }

    /* Loading dots */
    .apd-dots { display: inline-flex; gap: 5px; align-items: center; padding: 2px 0; }
    .apd-dots span {
      display: inline-block; width: 7px; height: 7px; border-radius: 50%;
      background: rgba(255,255,255,.9);
      animation: apd-bounce 0.9s ease-in-out infinite;
    }
    .apd-dots span:nth-child(1) { animation-delay: 0s;    }
    .apd-dots span:nth-child(2) { animation-delay: 0.18s; }
    .apd-dots span:nth-child(3) { animation-delay: 0.36s; }
    @keyframes apd-bounce {
      0%, 80%, 100% { transform: scale(0.65); opacity: 0.45; }
      40%            { transform: scale(1.1);  opacity: 1; }
    }

    /* ── Success Overlay ── */
    .apd-success-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px;
      background: #fff;
      opacity: 0; pointer-events: none;
      transform: scale(0.88);
      transition: opacity 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
                  transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      border-radius: 12px;
    }
    .apd-success-overlay--visible {
      opacity: 1; pointer-events: auto; transform: scale(1);
    }

    /* Ripple rings */
    .apd-ripple-wrap {
      position: relative;
      width: 90px; height: 90px;
      display: flex; align-items: center; justify-content: center;
    }
    .apd-ripple {
      position: absolute;
      border-radius: 50%;
      border: 2px solid rgba(10,179,156,0.5);
      opacity: 0;
    }
    .apd-success-overlay--visible .apd-ripple--1 {
      width: 90px; height: 90px;
      animation: apd-ripple 1.8s ease-out 0.8s infinite;
    }
    .apd-success-overlay--visible .apd-ripple--2 {
      width: 90px; height: 90px;
      animation: apd-ripple 1.8s ease-out 1.15s infinite;
    }
    .apd-success-overlay--visible .apd-ripple--3 {
      width: 90px; height: 90px;
      animation: apd-ripple 1.8s ease-out 1.5s infinite;
    }
    @keyframes apd-ripple {
      0%   { transform: scale(0.7); opacity: 0.6; }
      100% { transform: scale(1.55); opacity: 0; }
    }

    /* Checkmark SVG */
    .apd-success-ring { width: 74px; height: 74px; position: relative; z-index: 1; }
    .apd-checkmark    { width: 74px; height: 74px; }

    .apd-checkmark__circle {
      stroke: #0ab39c; stroke-width: 2.5;
      stroke-dasharray: 166; stroke-dashoffset: 166;
      stroke-linecap: round;
    }
    .apd-checkmark__check {
      stroke: #0ab39c; stroke-width: 3;
      stroke-dasharray: 48; stroke-dashoffset: 48;
      stroke-linecap: round; stroke-linejoin: round;
    }
    .apd-success-overlay--visible .apd-checkmark__circle {
      animation: apd-stroke-circle 0.65s cubic-bezier(0.65, 0, 0.45, 1) 0.25s forwards;
    }
    .apd-success-overlay--visible .apd-checkmark__check {
      animation: apd-stroke-check 0.38s cubic-bezier(0.65, 0, 0.45, 1) 0.78s forwards;
    }
    @keyframes apd-stroke-circle { to { stroke-dashoffset: 0; } }
    @keyframes apd-stroke-check  { to { stroke-dashoffset: 0; } }

    /* Text */
    .apd-success-text {
      font-size: 17px; font-weight: 700; color: #0ab39c;
      margin: 4px 0 0; opacity: 0;
    }
    .apd-success-sub {
      font-size: 12px; color: #878a99; margin: 0; opacity: 0;
    }
    .apd-success-overlay--visible .apd-success-text {
      animation: apd-fade-up 0.4s ease 0.9s both;
    }
    .apd-success-overlay--visible .apd-success-sub {
      animation: apd-fade-up 0.4s ease 1.05s both;
    }
    @keyframes apd-fade-up {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class ApproveDsrDialogComponent implements AfterViewInit {
  @ViewChild('confettiCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  approveState: 'idle' | 'loading' | 'done' = 'idle';
  isShaking  = false;
  isExiting  = false;

  private ctx!: CanvasRenderingContext2D;
  private particles: ConfettiParticle[] = [];
  private animFrame: number | null = null;

  constructor(private dialogRef: MatDialogRef<ApproveDsrDialogComponent>) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    canvas.width  = parent.offsetWidth;
    canvas.height = parent.offsetHeight;
  }

  /* ── Approve flow ────────────────────────────────────────── */
  onApprove(): void {
    this.approveState = 'loading';

    setTimeout(() => {
      this.approveState = 'done';
      // Small delay so overlay transition starts first
      setTimeout(() => this.launchConfetti(), 350);
      setTimeout(() => this.dialogRef.close('approved'), 2800);
    }, 1600);
  }

  /* ── Cancel flow — shake then smooth exit ────────────────── */
  onCancel(): void {
    if (this.approveState === 'loading') return;

    // 1. Shake
    this.isShaking = true;
    setTimeout(() => {
      this.isShaking = false;

      // 2. Exit slide-down
      this.isExiting = true;
      setTimeout(() => this.dialogRef.close('cancel'), 380);
    }, 450);
  }

  /* ── Confetti ────────────────────────────────────────────── */
  private launchConfetti(): void {
    this.resizeCanvas();
    const canvas = this.canvasRef.nativeElement;
    const colors = ['#405189','#0ab39c','#f7b84b','#f06548','#6691e7','#ffffff'];

    this.particles = Array.from({ length: 72 }, () => ({
      x:   canvas.width  / 2 + (Math.random() - 0.5) * 60,
      y:   canvas.height / 2 - 10,
      vx:  (Math.random() - 0.5) * 9,
      vy:  -(Math.random() * 7 + 3),
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.25,
      w:   Math.random() * 8 + 5,
      h:   Math.random() * 4 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      gravity: 0.22 + Math.random() * 0.12,
    }));

    this.animateConfetti();
  }

  private animateConfetti(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    for (const p of this.particles) {
      p.vy  += p.gravity;
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.rotV;
      p.vx  *= 0.985;

      if (p.y < canvas.height + 20) {
        alive = true;
        p.alpha = Math.max(0, p.alpha - 0.012);
        this.ctx.save();
        this.ctx.globalAlpha = p.alpha;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();
      }
    }

    if (alive) {
      this.animFrame = requestAnimationFrame(() => this.animateConfetti());
    } else {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

/* ── Internal confetti particle type ──────────────────────── */
interface ConfettiParticle {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  w: number; h: number;
  color: string; alpha: number; gravity: number;
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-dsr-detail',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatTooltipModule, MatDialogModule,
  ],
  templateUrl: './dsr-detail.html',
  styleUrl: './dsr-detail.css',
})
export class DsrDetail implements OnInit {
  data: DsrPayload | null = null;
  readonly maxDailyHours = 8;

  taskStatuses = [
    { value: 'on_track', label: 'On Track', icon: 'check_circle' },
    { value: 'at_risk',  label: 'At Risk',  icon: 'warning'      },
    { value: 'blocked',  label: 'Blocked',  icon: 'cancel'       },
  ];

  constructor(
    private dsrState: DsrDataService,
    private router:   Router,
    private dialog:   MatDialog,
  ) {}

  ngOnInit(): void {
    this.data = this.dsrState.load();
    if (!this.data) this.router.navigate(['/employee/submit-dsr']);
  }

  get loggedCategories(): DsrTimeCategory[] {
    if (!this.data) return [];
    return this.data.timeCategories.filter(c => this.data!.timeByCategory[c.key] > 0);
  }

  getStatusLabel(value: string): string {
    return this.taskStatuses.find(s => s.value === value)?.label ?? value;
  }

  getStatusIcon(value: string): string {
    return this.taskStatuses.find(s => s.value === value)?.icon ?? 'help';
  }

  getBarPct(hours: number): number {
    return Math.min((hours / this.maxDailyHours) * 100, 100);
  }

  getCategoryDescription(cat: DsrTimeCategory): string {
    return (cat as any).description || '';
  }

  openApproveDialog(): void {
    this.dialog.open(ApproveDsrDialogComponent, {
      width: '420px',
      disableClose: true,
      panelClass: 'dsr-dialog-panel',
    });
  }

  goBack(): void { this.router.navigate(['/employee']); }

  submitNew(): void {
    this.dsrState.reset();
    this.router.navigate(['/employee']);
  }
}