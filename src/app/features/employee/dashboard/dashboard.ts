// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
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
import { RiskDialog } from '../../../shared/risk-dialog/risk-dialog';
import { TaskDialog } from '../../../shared/task-dialog/task-dialog';
import { Risk, Task } from '../../../shared/models';

export interface TaskDialogData {
  mode: 'add' | 'edit';
  task?: Task;
}


@Component({
  selector: 'app-dashboard',
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
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard  implements OnInit { 
  currentDate: Date = new Date();
  currentView: 'daily' | 'weekly' = 'daily';
  tasks: { [dateKey: string]: Task[] } = {};
  risks: Risk[] = [];

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    const saved      = localStorage.getItem('ng_tasks');
    const savedRisks = localStorage.getItem('ng_risks');
    if (saved)      this.tasks = JSON.parse(saved);
    if (savedRisks) this.risks = JSON.parse(savedRisks);

    // Seed demo data for today
    const key = this.getDateKey(this.currentDate);
    if (!this.tasks[key]) {
      this.tasks[key] = [
        {
          id: '1',
          name: 'Design System Updates',
          description: 'Update button components and color palette',
          hours: 5.5,
          status: 'in-progress'
        },
        {
          id: '2',
          name: 'API Integration',
          description: 'Integrate user authentication API endpoints',
          hours: 3,
          status: 'completed'
        }
      ];
      this.saveTasks();
    }
  }

  // ─── Getters ───────────────────────────────────────────
  get currentDateKey(): string {
    return this.getDateKey(this.currentDate);
  }

  get currentTasks(): Task[] {
    return this.tasks[this.currentDateKey] || [];
  }

  get totalHours(): number {
    return this.currentTasks.reduce((sum, t) => sum + (t.hours || 0), 0);
  }

  get currentRisks(): Risk[] {
    return this.risks.filter(r => r.date === this.currentDateKey);
  }

  get formattedDate(): string {
    return this.currentDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  get navDate(): string {
    return this.currentDate.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // ─── Date Helpers ──────────────────────────────────────
  getDateKey(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  navigateDate(dir: number): void {
    const d = new Date(this.currentDate);
    d.setDate(d.getDate() + (this.currentView === 'weekly' ? 7 * dir : dir));
    this.currentDate = d;
  }

  goToToday(): void {
    this.currentDate = new Date();
  }

  setView(v: 'daily' | 'weekly'): void {
    this.currentView = v;
  }

  trackById(_index: number, item: Task): string {
    return item.id;
  }

  // ─── Task CRUD ─────────────────────────────────────────
  openAddDialog(): void {
    const data: TaskDialogData = { mode: 'add' };

    this.dialog.open(TaskDialog, { width: '480px', data })
      .afterClosed()
      .subscribe((result: Partial<Task> | null) => {
        if (!result) return;

        const key = this.currentDateKey;
        if (!this.tasks[key]) this.tasks[key] = [];

        const newTask: Task = {
          id:          Date.now().toString(),
          name:        result.name!,
          description: result.description || '',
          hours:       result.hours!,
          status:      result.status || 'pending'
        };

        this.tasks[key] = [...this.tasks[key], newTask];
        this.saveTasks();
      });
  }

  openEditDialog(task: Task): void {
    const data: TaskDialogData = { mode: 'edit', task: { ...task } };

    this.dialog.open(TaskDialog, { width: '480px', data })
      .afterClosed()
      .subscribe((result: Partial<Task> | null) => {
        if (!result) return;

        const key = this.currentDateKey;
        this.tasks[key] = this.tasks[key].map(t =>
          t.id === task.id
            ? { ...t, ...result, id: task.id }
            : t
        );
        this.saveTasks();
      });
  }

  deleteTask(taskId: string): void {
    const key = this.currentDateKey;
    this.tasks[key] = (this.tasks[key] || []).filter(t => t.id !== taskId);
    this.saveTasks();
  }

  // ─── Risk Dialog ───────────────────────────────────────
  openRiskDialog(): void {
    this.dialog.open(RiskDialog, {
      width: '480px',
      data: { risks: this.currentRisks, dateKey: this.currentDateKey }
    })
    .afterClosed()
    .subscribe((updated: Risk[] | undefined) => {
      if (updated === undefined) return;
      this.risks = [
        ...this.risks.filter(r => r.date !== this.currentDateKey),
        ...updated
      ];
      localStorage.setItem('ng_risks', JSON.stringify(this.risks));
    });
  }

  // ─── UI Helpers ────────────────────────────────────────
  getStatusClass(status: string): string {
    if (status === 'in-progress') return 'card-inprogress';
    if (status === 'completed')   return 'card-completed';
    return 'card-pending';
  }

  getStatusIcon(status: string): string {
    if (status === 'in-progress') return 'play_circle';
    if (status === 'completed')   return 'check_circle';
    return 'radio_button_unchecked';
  }

  getStatusLabel(status: string): string {
    if (status === 'in-progress') return 'In Progress';
    if (status === 'completed')   return 'Completed';
    return 'Pending';
  }

  saveTasks(): void {
    localStorage.setItem('ng_tasks', JSON.stringify(this.tasks));
  }
}
