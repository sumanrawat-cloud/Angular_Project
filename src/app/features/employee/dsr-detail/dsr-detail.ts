import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MatCardModule }    from '@angular/material/card';
import { MatButtonModule }  from '@angular/material/button';
import { MatIconModule }    from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DsrDataService, DsrPayload, DsrTimeCategory } from '../../../core/services/dsr-data-service';

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-dsr-detail',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatTooltipModule,
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

  goBack(): void { this.router.navigate(['/employee']); }

  submitNew(): void {
    this.dsrState.reset();
    this.router.navigate(['/employee']);
  }
}