import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
 
/* ── Internal confetti particle type ──────────────────────── */
interface ConfettiParticle {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  w: number; h: number;
  color: string; alpha: number; gravity: number;
}
 

@Component({
  selector: 'app-approve-dsr-dialog',
 standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './approve-dsr-dialog.html',
  styleUrl: './approve-dsr-dialog.css',
})
export class ApproveDsrDialog implements AfterViewInit {
  @ViewChild('confettiCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
 
  approveState: 'idle' | 'loading' | 'done' = 'idle';
  isShaking  = false;
  isExiting  = false;
 
  private ctx!: CanvasRenderingContext2D;
  private particles: ConfettiParticle[] = [];
  private animFrame: number | null = null;
 
  constructor(private dialogRef: MatDialogRef<ApproveDsrDialog>) {}
 
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
    const colors = ['#405189', '#0ab39c', '#f7b84b', '#f06548', '#6691e7', '#ffffff'];
 
    this.particles = Array.from({ length: 72 }, () => ({
      x:     canvas.width  / 2 + (Math.random() - 0.5) * 60,
      y:     canvas.height / 2 - 10,
      vx:    (Math.random() - 0.5) * 9,
      vy:    -(Math.random() * 7 + 3),
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 0.25,
      w:     Math.random() * 8 + 5,
      h:     Math.random() * 4 + 3,
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
