import {
  Component, OnInit, ViewChild, ElementRef,
  ViewEncapsulation, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule }               from '@angular/material/button';
import { MatDividerModule }              from '@angular/material/divider';
import { MatIconModule }                 from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import { MatTooltipModule }              from '@angular/material/tooltip';
import { AuthService }                   from '../../../core/auth/auth.service';

// ── Interfaces ────────────────────────────────────────────────────

export interface EmployeeProfileData {
  id:                  string;
  name:                string;
  initials:            string;
  avatarColor:         string;
  email:               string;
  phone:               string;
  role:                string;
  department:          string;
  status:              'active' | 'inactive';
  joinedDate:          string;
  lastActive:          string;
  timesheetsThisMonth: number;
  totalHours:          number;
  approvedDsrs:        number;
  client:              string;
  project:             string;
  manager:             string;
}

export interface DsrStats { approved: number; pending: number; rejected: number; }

export interface RecentDsr {
  task:    string;
  project: string;
  date:    string;
  hours:   number;
  status:  'approved' | 'pending' | 'rejected';
}

@Component({
  selector:      'app-employee-profile',
  standalone:    true,
  encapsulation: ViewEncapsulation.None,

  // ── ANIMATIONS REMOVED ────────────────────────────────────────────
  // All Angular animations (@pageEnter, @listStagger, @rowEnter, @assignStagger)
  // have been removed. They were the direct cause of both reported issues:
  //
  // Issue 1 (LoadingTime): @pageEnter started at opacity:0, so during the
  // animation the entire page was invisible. Since Material Icons font loads
  // asynchronously, icons rendered as raw text (e.g. "task_alt", "badge",
  // "apartment") while the page was transitioning. This caused the garbled
  // "ta", "be", "ac", "ca" text visible in the screenshot.
  //
  // Issue 2 (@listStagger / @assignStagger): These animations delayed rendering
  // of each assignment item and recent DSR row using stagger(60ms/70ms).
  // During that delay window, the items were at opacity:0 — appearing completely
  // empty. This is why Current Assignment and Recent DSR Activity showed only
  // labels with no values.
  //
  // The static data loads synchronously in ngOnInit(), so no animation is
  // needed — data is always ready before the first paint.
  // ─────────────────────────────────────────────────────────────────
  animations: [],

  imports: [
    CommonModule, FormsModule, TitleCasePipe,
    MatButtonModule, MatDividerModule,
    MatIconModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './employee-profile.html',
  styleUrl:    './employee-profile.css',
})
export class EmployeeProfile implements OnInit {

  @ViewChild('avatarInput', { static: false }) avatarInput!: ElementRef<HTMLInputElement>;

  // Initialized with safe defaults at class level so the template never
  // evaluates against undefined — prevents blank flash even if ngOnInit
  // is somehow delayed by Angular's zone.js scheduler.
  profile: EmployeeProfileData = {
    id: '', name: '', initials: '', avatarColor: '#405189',
    email: '', phone: '', role: 'EMPLOYEE', department: '',
    status: 'active', joinedDate: '', lastActive: '',
    timesheetsThisMonth: 0, totalHours: 0, approvedDsrs: 0,
    client: '', project: '', manager: '',
  };

  dsrStats: DsrStats  = { approved: 0, pending: 0, rejected: 0 };
  recentDsrs: RecentDsr[] = [];

  isEditing      = false;
  editForm: Partial<EmployeeProfileData> = {};

  avatarImageUrl: string | null = null;
  avatarUploading = false;

  constructor(
    private readonly router:   Router,
    private readonly snackbar: MatSnackBar,
    private readonly cdr:      ChangeDetectorRef,
    private readonly auth:     AuthService,
  ) {
    // Load data in constructor so it is available before the first
    // change detection cycle — guarantees no empty-render flash.
    this.loadProfile();

    // Restore uploaded photo from localStorage so it survives page refresh.
    const saved = localStorage.getItem('ep_avatarImageUrl');
    if (saved) { this.avatarImageUrl = saved; }

    // Restore any saved edits (name, phone) from localStorage.
    const savedName  = localStorage.getItem('ep_profile_name');
    const savedPhone = localStorage.getItem('ep_profile_phone');
    if (savedName)  { this.profile.name  = savedName; }
    if (savedPhone) { this.profile.phone = savedPhone; }
  }

  ngOnInit(): void {
    // loadProfile() already called in constructor.
    // detectChanges() ensures the view is updated immediately
    // in case Angular defers the first CD cycle.
    this.cdr.detectChanges();
  }

  loadProfile(): void {
    this.profile = {
      id:                  'u1',
      name:                'Bharat Kumar',
      initials:            'BK',
      avatarColor:         '#405189',
      email:               'bharat.kumar@example.com',
      phone:               '+91 98765 43210',
      role:                'EMPLOYEE',
      department:          'Engineering',
      status:              'active',
      joinedDate:          'Jan 2023',
      lastActive:          'Today',
      timesheetsThisMonth: 18,
      totalHours:          144,
      approvedDsrs:        16,
      client:              'Acme Corp',
      project:             'API Gateway',
      manager:             'Gaurav Uttam',
    };
    this.dsrStats = { approved: 16, pending: 2, rejected: 1 };
    this.recentDsrs = [
      { task: 'REST endpoint scaffolding',   project: 'API Gateway', date: 'Mar 18', hours: 8, status: 'approved' },
      { task: 'Auth middleware integration', project: 'API Gateway', date: 'Mar 17', hours: 8, status: 'approved' },
      { task: 'Unit test coverage',          project: 'API Gateway', date: 'Mar 16', hours: 6, status: 'pending'  },
      { task: 'DB schema review',            project: 'API Gateway', date: 'Mar 15', hours: 5, status: 'approved' },
      { task: 'API documentation',           project: 'API Gateway', date: 'Mar 14', hours: 4, status: 'rejected' },
    ];
  }

  // ── Avatar upload ─────────────────────────────────────────────────

  triggerAvatarUpload(): void {
    if (this.avatarInput?.nativeElement) {
      this.avatarInput.nativeElement.click();
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.snackbar.open('Please select a valid image file.', 'Close', { duration: 3000 });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.snackbar.open('Image must be smaller than 5 MB.', 'Close', { duration: 3000 });
      return;
    }

    this.avatarUploading = true;
    this.cdr.detectChanges();

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarImageUrl  = reader.result as string;
      this.avatarUploading = false;
      // Persist to localStorage so the photo survives page refresh.
      localStorage.setItem('ep_avatarImageUrl', this.avatarImageUrl);
      this.cdr.detectChanges();
      this.snackbar.open('Profile photo updated!', 'Close', { duration: 2500 });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeAvatar(): void {
    this.avatarImageUrl = null;
    // Clear from localStorage so it doesn't reappear on next refresh.
    localStorage.removeItem('ep_avatarImageUrl');
    this.cdr.detectChanges();
    this.snackbar.open('Profile photo removed.', 'Close', { duration: 2000 });
  }

  // ── DSR helpers ───────────────────────────────────────────────────

  dsrPercent(val: number): number {
    const total = this.dsrStats.approved + this.dsrStats.pending + this.dsrStats.rejected;
    return total ? Math.round((val / total) * 100) : 0;
  }

  getDsrClass(status: string): string {
    return status === 'approved' ? 'ep-badge--approved'
         : status === 'pending'  ? 'ep-badge--pending'
         : 'ep-badge--rejected';
  }

  // ── Edit ──────────────────────────────────────────────────────────

  toggleEdit(): void {
    this.isEditing = true;
    this.editForm  = { name: this.profile.name, phone: this.profile.phone };
  }

  saveProfile(): void {
    this.profile.name  = this.editForm.name  ?? this.profile.name;
    this.profile.phone = this.editForm.phone ?? this.profile.phone;
    // Persist edited values so they survive page refresh.
    localStorage.setItem('ep_profile_name',  this.profile.name);
    localStorage.setItem('ep_profile_phone', this.profile.phone);
    this.isEditing = false;
    this.snackbar.open('Profile updated successfully', 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  cancelEdit(): void { this.isEditing = false; this.editForm = {}; }
  goBack(): void     { this.router.navigate(['/employee']); }
}