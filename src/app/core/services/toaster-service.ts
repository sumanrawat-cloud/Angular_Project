import { Injectable, signal } from '@angular/core';
 
export interface ToastMessage {
  id:      number;
  message: string;
  type:    'success' | 'info' | 'warning' | 'error';
}
 
@Injectable({ providedIn: 'root' })

@Injectable({
  providedIn: 'root',
})
export class ToasterService {
  
  toasts = signal<ToastMessage[]>([]);
  private counter = 0;
 
  show(message: string, type: ToastMessage['type'] = 'success', duration = 3500): void {
    const id = ++this.counter;
    this.toasts.update(list => [...list, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }
 
  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}