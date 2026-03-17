// src/app/risk-dialog/risk-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Risk } from '../models';

export interface RiskDialogData {
  risks: Risk[];
  dateKey: string;
}

@Component({
  selector: 'app-risk-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './risk-dialog.html',
  styleUrl: './risk-dialog.css',
})
export class RiskDialog {
  riskText: string = '';
  risks: Risk[];
  dateKey: string;

  constructor(
    public dialogRef: MatDialogRef<RiskDialog>,
    @Inject(MAT_DIALOG_DATA) public data: RiskDialogData
  ) {
    this.risks   = [...data.risks];
    this.dateKey = data.dateKey;
  }

  addRisk(): void {
    const text = this.riskText.trim();
    if (!text) return;

    this.risks.push({
      id:   Date.now().toString(),
      text: text,
      date: this.dateKey
    });

    this.riskText = '';
  }

  removeRisk(id: string): void {
    this.risks = this.risks.filter(r => r.id !== id);
  }

  close(): void {
    this.dialogRef.close(this.risks);
  }
}
