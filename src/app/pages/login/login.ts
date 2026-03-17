import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
   // RouterLink,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loginForm!: FormGroup;
  hidePassword = true;
  loginError   = '';

  // ── UI state for toaster + transition ──────────────────
  showToast   = false;
  isExiting   = false;
  isLoggingIn = false;

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    // If already logged in, redirect away from login page
    if (this.auth.isLoggedIn()) {
      const role = this.auth.getRole();
      if (role === 'EMPLOYEE')    this.router.navigate(['/employee']);
      if (role === 'MANAGER')     this.router.navigate(['/manager']);
      if (role === 'super_admin') this.router.navigate(['/super-admin']);
    }
  }

  onSubmit() {
    if (this.isLoggingIn) return;
    this.loginError = '';

    const { email, password } = this.loginForm.value;

    if (this.auth.login(email, password)) {
      const role: UserRole | null = this.auth.getRole();

      // 1. Show loading state on button
      this.isLoggingIn = true;

      // 2. Show success toaster
      this.showToast = true;

      // 3. After toaster appears (800ms), start page exit animation
      setTimeout(() => {
        this.isExiting = true;
      }, 800);

      // 4. Navigate after exit animation completes (800 + 600ms)
      setTimeout(() => {
        if (role === 'EMPLOYEE')    this.router.navigate(['/employee']);
        if (role === 'MANAGER')     this.router.navigate(['/manager']);
        if (role === 'super_admin') this.router.navigate(['/super-admin']);
      }, 1400);

    } else {
      this.loginError = 'Incorrect email or password!';
    }
  }

  // ── Smooth transition to Forgot Password ───────────────
  forgetpassword() {
    this.isExiting = true;
    setTimeout(() => {
      this.router.navigate(['/forgot-password']);
    }, 400);
  }
}