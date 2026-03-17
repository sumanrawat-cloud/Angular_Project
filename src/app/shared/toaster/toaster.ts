import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToasterService, ToastMessage } from '../../core/services/toaster-service';

@Component({
  selector: 'app-toaster',
 standalone: true,
  imports: [CommonModule],
  templateUrl: './toaster.html',
  styleUrl: './toaster.css',
})
export class Toaster {
  toastService = inject(ToasterService);
 
  // Required by *ngFor trackBy
  trackById(_index: number, toast: ToastMessage): number {
    return toast.id;
  }
}
 
