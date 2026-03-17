// src/app/task-dialog/task-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { Task } from '../models';
import { Toaster } from '../../core/toaster';

export interface TaskDialogData {
  mode: 'add' | 'edit';
  task?: Task;
}


@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './task-dialog.html',
  styleUrl: './task-dialog.css',
})
export class TaskDialog {
mode: 'add' | 'edit';
  taskName: string = '';
  taskDescription: string = '';
  taskHours: number | null = null;
  taskStatus: 'pending' | 'in-progress' | 'completed' = 'pending';

  constructor(
    public dialogRef: MatDialogRef<TaskDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TaskDialogData,
    private toaster: Toaster
  ) {
    this.mode = data.mode;

    if (data.mode === 'edit' && data.task) {
      this.taskName        = data.task.name;
      this.taskDescription = data.task.description;
      this.taskHours       = data.task.hours;
      this.taskStatus      = data.task.status;
    }
  }

  isFormValid(): boolean {
    return !!(this.taskName?.trim() && this.taskHours && this.taskHours > 0);
  }

  save(): void {
    if (!this.isFormValid()) return;

    const result: Partial<Task> = {
      name:        this.taskName.trim(),
      description: this.taskDescription.trim(),
      hours:       this.taskHours as number,
      status:      this.taskStatus,
    };

    this.dialogRef.close(result);
    this.toaster.success("Task Added Successfully");
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
