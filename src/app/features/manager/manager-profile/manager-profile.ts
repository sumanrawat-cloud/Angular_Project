import {
  Component, OnInit, ViewChild, ElementRef,
  ViewEncapsulation, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule }      from '@angular/material/button';
import { MatDividerModule }     from '@angular/material/divider';
import { MatIconModule }        from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule }     from '@angular/material/tooltip';

// ── Interfaces ────────────────────────────────────────────────────

export interface ManagerProfileData {
  id:               string;
  name:             string;
  initials:         string;
  avatarColor:      string;
  email:            string;
  phone:            string;
  department:       string;
  joinedDate:       string;
  teamSize:         number;
  activeProjects:   number;
  pendingApprovals: number;
  avgUtilization:   number;
}

export interface TeamMember {
  name:        string;
  initials:    string;
  avatarColor: string;
  project:     string;
  lastActive:  string;
  pendingDsrs: number;
}

export interface PendingDsr {
  id:           string;
  employeeName: string;
  initials:     string;
  avatarColor:  string;
  task:         string;
  date:         string;
  hours:        number;
}

export interface ProjectSummary {
  name:        string;
  client:      string;
  color:       string;
  completion:  number;
  memberCount: number;
}

@Component({
  selector:      'app-manager-profile',
  standalone:    true,
  encapsulation: ViewEncapsulation.None,

  // Animations removed — same reason as employee-profile:
  // @pageEnter started at opacity:0, causing blank flash on load
  // and garbled Material Icons text during font loading.
  animations: [],

  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDividerModule,
    MatIconModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './manager-profile.html',
  styleUrl:    './manager-profile.css',
})
export class ManagerProfile implements OnInit {

  // Safe defaults at class level — template never sees undefined.
  profile: ManagerProfileData = {
    id: '', name: '', initials: '', avatarColor: '#0ab39c',
    email: '', phone: '', department: '', joinedDate: '',
    teamSize: 0, activeProjects: 0, pendingApprovals: 0, avgUtilization: 0,
  };

  teamMembers: TeamMember[]     = [];
  pendingDsrs: PendingDsr[]     = [];
  projects:    ProjectSummary[] = [];

  isEditing = false;
  editForm: Partial<ManagerProfileData> = {};

  /** Data-URL of uploaded photo — null means show initials */
  avatarImageUrl: string | null = null;
  /** True while FileReader is running — shows spinner ring on avatar */
  avatarUploading = false;

  @ViewChild('avatarInput', { static: false }) avatarInput!: ElementRef<HTMLInputElement>;

  constructor(
    private readonly router:   Router,
    private readonly snackbar: MatSnackBar,
    private readonly cdr:      ChangeDetectorRef,
  ) {
    // Load data in constructor so it is available before the first render.
    this.loadProfile();

    // Restore saved edits from localStorage so they survive page refresh.
    const savedName  = localStorage.getItem('mp_profile_name');
    const savedPhone = localStorage.getItem('mp_profile_phone');
    if (savedName)  { this.profile.name  = savedName; }
    if (savedPhone) { this.profile.phone = savedPhone; }

    // Restore uploaded photo from localStorage.
    const savedPhoto = localStorage.getItem('mp_avatarImageUrl');
    if (savedPhoto) { this.avatarImageUrl = savedPhoto; }
  }

  ngOnInit(): void {
    this.cdr.detectChanges();
  }

  loadProfile(): void {
    this.profile = {
      id:               'u2',
      name:             'Gaurav Uttam',
      initials:         'GU',
      avatarColor:      '#0ab39c',
      email:            'gaurav.uttam@company.com',
      phone:            '+91 98765 11223',
      department:       'Engineering',
      joinedDate:       'Mar 2022',
      teamSize:         5,
      activeProjects:   3,
      pendingApprovals: 3,
      avgUtilization:   77,
    };

    this.teamMembers = [
      { name:'Bharat Kumar',   initials:'BK', avatarColor:'#405189', project:'API Gateway',       lastActive:'Today',     pendingDsrs:1 },
      { name:'Ankit Sharma',   initials:'AS', avatarColor:'#f7b731', project:'API Gateway',       lastActive:'Yesterday', pendingDsrs:1 },
      { name:'Divya Krishnan', initials:'DK', avatarColor:'#00695c', project:'Cloud Migration',   lastActive:'Today',     pendingDsrs:0 },
      { name:'Saurabh Joshi',  initials:'SJ', avatarColor:'#e65100', project:'Dashboard Rebuild', lastActive:'Yesterday', pendingDsrs:1 },
      { name:'Sumit Verma',    initials:'SV', avatarColor:'#f06548', project:'QA Automation',     lastActive:'Today',     pendingDsrs:0 },
    ];

    this.pendingDsrs = [
      { id:'d1', employeeName:'Bharat Kumar',  initials:'BK', avatarColor:'#405189', task:'REST endpoint scaffolding',   date:'Mar 18', hours:8 },
      { id:'d2', employeeName:'Ankit Sharma',  initials:'AS', avatarColor:'#f7b731', task:'Auth middleware integration', date:'Mar 17', hours:8 },
      { id:'d3', employeeName:'Saurabh Joshi', initials:'SJ', avatarColor:'#e65100', task:'Chart.js KPI integration',    date:'Mar 17', hours:5 },
    ];

    this.projects = [
      { name:'API Gateway',       client:'Acme Corp', color:'#405189', completion:72, memberCount:2 },
      { name:'Cloud Migration',   client:'TechNova',  color:'#0ab39c', completion:58, memberCount:2 },
      { name:'Dashboard Rebuild', client:'Acme Corp', color:'#f06548', completion:40, memberCount:1 },
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
      localStorage.setItem('mp_avatarImageUrl', this.avatarImageUrl);
      this.cdr.detectChanges();
      this.snackbar.open('Profile photo updated!', 'Close', { duration: 2500 });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeAvatar(): void {
    this.avatarImageUrl = null;
    localStorage.removeItem('mp_avatarImageUrl');
    this.cdr.detectChanges();
    this.snackbar.open('Profile photo removed.', 'Close', { duration: 2000 });
  }

  // ── Actions ───────────────────────────────────────────────────────

  approveDsr(dsr: PendingDsr): void {
    this.pendingDsrs = this.pendingDsrs.filter(d => d.id !== dsr.id);
    this.profile.pendingApprovals = this.pendingDsrs.length;
    this.snackbar.open(`DSR approved for ${dsr.employeeName}`, 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  rejectDsr(dsr: PendingDsr): void {
    this.pendingDsrs = this.pendingDsrs.filter(d => d.id !== dsr.id);
    this.profile.pendingApprovals = this.pendingDsrs.length;
    this.snackbar.open(`DSR rejected for ${dsr.employeeName}`, 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  toggleEdit(): void {
    this.isEditing = true;
    this.editForm = { name: this.profile.name, phone: this.profile.phone };
  }

  saveProfile(): void {
    this.profile.name  = this.editForm.name  ?? this.profile.name;
    this.profile.phone = this.editForm.phone ?? this.profile.phone;
    // Persist edited values so they survive page refresh.
    localStorage.setItem('mp_profile_name',  this.profile.name);
    localStorage.setItem('mp_profile_phone', this.profile.phone);
    this.isEditing = false;
    this.snackbar.open('Profile updated successfully', 'Close', { duration: 2500 });
    this.cdr.detectChanges();
  }

  cancelEdit(): void { this.isEditing = false; this.editForm = {}; }
  goBack(): void     { this.router.navigate(['/manager']); }
  
}