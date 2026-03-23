import {
  Component, OnInit, ViewChild, ElementRef,
  ViewEncapsulation, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { Router }       from '@angular/router';

import { MatButtonModule }      from '@angular/material/button';
import { MatDividerModule }     from '@angular/material/divider';
import { MatIconModule }        from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule }     from '@angular/material/tooltip';

// ── Interfaces ────────────────────────────────────────────────────

export interface AdminProfileData {
  id:           string;
  name:         string;
  initials:     string;
  avatarColor:  string;
  email:        string;
  phone:        string;
  organisation: string;
  since:        string;
}

export interface OrgStats {
  totalUsers: number; activeToday: number;
  pendingDsrs: number; openRisks: number;
}

export interface Permission {
  icon: string; name: string; desc: string; color: string;
}

export interface DeptStat {
  name: string; icon: string; color: string;
  totalMembers: number; activeToday: number; avgUtil: number; pendingDsrs: number;
}

export interface ActivityItem {
  icon: string; text: string; time: string; color: string;
}

@Component({
  selector:      'app-admin-profile',
  standalone:    true,
  encapsulation: ViewEncapsulation.None,

  // Animations removed — @pageEnter started at opacity:0 causing blank
  // flash on load and garbled Material Icons text during font loading.
  animations: [],

  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDividerModule,
    MatIconModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './admin-profile.html',
  styleUrl:    './admin-profile.css',
})
export class AdminProfile implements OnInit {

  @ViewChild('avatarInput', { static: false }) avatarInput!: ElementRef<HTMLInputElement>;

  // Initialized with safe defaults — template never sees undefined on any render.
  profile: AdminProfileData = {
    id: '', name: '', initials: '', avatarColor: '#405189',
    email: '', phone: '', organisation: '', since: '',
  };

  orgStats: OrgStats         = { totalUsers: 0, activeToday: 0, pendingDsrs: 0, openRisks: 0 };
  permissions:    Permission[]   = [];
  departments:    DeptStat[]     = [];
  recentActivity: ActivityItem[] = [];

  isEditing = false;
  editForm: Partial<AdminProfileData> = {};

  /** Data-URL of uploaded photo — null means show initials */
  avatarImageUrl: string | null = null;
  /** True while FileReader is running — shows spinner ring */
  avatarUploading = false;

  constructor(
    private readonly router:   Router,
    private readonly snackbar: MatSnackBar,
    private readonly cdr:      ChangeDetectorRef,
  ) {
    // Load data in constructor — available before the first render.
    this.loadProfile();

    // Restore photo from localStorage so it survives page refresh.
    const savedPhoto = localStorage.getItem('sap_avatarImageUrl');
    if (savedPhoto) { this.avatarImageUrl = savedPhoto; }

    // Restore edited name and phone from localStorage.
    const savedName  = localStorage.getItem('sap_profile_name');
    const savedPhone = localStorage.getItem('sap_profile_phone');
    if (savedName)  { this.profile.name  = savedName; }
    if (savedPhone) { this.profile.phone = savedPhone; }
  }

  ngOnInit(): void {
    this.cdr.detectChanges();
  }

  loadProfile(): void {
    this.profile = {
      id:           'sa1',
      name:         'Super Admin',
      initials:     'SA',
      avatarColor:  '#405189',
      email:        'admin@company.com',
      phone:        '+91 98000 00001',
      organisation: 'Timesheet Tracker',
      since:        'Jan 2021',
    };

    this.orgStats = { totalUsers: 12, activeToday: 9, pendingDsrs: 6, openRisks: 4 };

    this.permissions = [
      { icon:'people',               name:'User Management',   desc:'Create, edit, deactivate users',          color:'blue'   },
      { icon:'folder_special',       name:'Project & Client',  desc:'Manage all projects and client accounts',  color:'purple' },
      { icon:'assessment',           name:'DSR Oversight',     desc:'View and override all DSR submissions',    color:'teal'   },
      { icon:'report_problem',       name:'Risk Management',   desc:'Escalate and resolve organisation risks',  color:'warn'   },
      { icon:'analytics',            name:'Full Reports',      desc:'Export and view all analytics data',       color:'amber'  },
      { icon:'admin_panel_settings', name:'System Config',     desc:'Manage roles, permissions, and settings',  color:'blue'   },
    ];

    this.departments = [
      { name:'Engineering', icon:'code',       color:'#405189', totalMembers:5, activeToday:4, avgUtil:77, pendingDsrs:3 },
      { name:'QA',          icon:'bug_report', color:'#0ab39c', totalMembers:3, activeToday:3, avgUtil:84, pendingDsrs:1 },
      { name:'Design',      icon:'palette',    color:'#f06548', totalMembers:4, activeToday:2, avgUtil:55, pendingDsrs:2 },
    ];

    this.recentActivity = [
      { icon:'person_add',    text:'New employee Arjun Pillai onboarded',     time:'Today, 10:12 AM', color:'teal'   },
      { icon:'check_circle',  text:'6 DSRs approved across Engineering',       time:'Today, 09:30 AM', color:'teal'   },
      { icon:'warning_amber', text:'High-risk flagged: API endpoints blocked', time:'Yesterday',       color:'warn'   },
      { icon:'toggle_off',    text:'Kuldeep Singh marked inactive',            time:'Mar 16',          color:'amber'  },
      { icon:'bar_chart',     text:'Monthly report exported (March 2025)',     time:'Mar 15',          color:'blue'   },
      { icon:'domain_add',    text:'New project "Dashboard Rebuild" created',  time:'Mar 12',          color:'purple' },
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
      localStorage.setItem('sap_avatarImageUrl', this.avatarImageUrl);
      this.cdr.detectChanges();
      this.snackbar.open('Profile photo updated!', 'Close', { duration: 2500 });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeAvatar(): void {
    this.avatarImageUrl = null;
    localStorage.removeItem('sap_avatarImageUrl');
    this.cdr.detectChanges();
    this.snackbar.open('Profile photo removed.', 'Close', { duration: 2000 });
  }

  // ── Edit ──────────────────────────────────────────────────────────

  toggleEdit(): void {
    this.isEditing = true;
    this.editForm  = { name: this.profile.name, phone: this.profile.phone };
  }

  saveProfile(): void {
    this.profile.name  = this.editForm.name  ?? this.profile.name;
    this.profile.phone = this.editForm.phone ?? this.profile.phone;
    localStorage.setItem('sap_profile_name',  this.profile.name);
    localStorage.setItem('sap_profile_phone', this.profile.phone);
    this.isEditing = false;
    this.snackbar.open('Profile updated successfully', 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  cancelEdit(): void { this.isEditing = false; this.editForm = {}; }
  goBack(): void     { this.router.navigate(['/super-admin']); }

  /** Maps activity color name to its CSS variable value for inline style binding */
  getActColor(color: string): string {
    const map: Record<string, string> = {
      teal:   'var(--success)',
      warn:   'var(--warn)',
      amber:  'var(--amber)',
      blue:   'var(--primary)',
      purple: 'var(--purple)',
    };
    return map[color] ?? 'var(--primary)';
  }
}