import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-submit-success-dialog',
   standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './submit-success-dialog.html',
  styleUrl: './submit-success-dialog.css',
})
export class SubmitSuccessDialog {
   constructor(@Inject(MAT_DIALOG_DATA) public data: { date: Date }) {}
}
