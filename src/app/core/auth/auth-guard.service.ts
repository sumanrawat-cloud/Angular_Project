import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {

    // ✅ FIX: Removed the `if (!this.authService)` check — a properly injected
    //         service is never undefined. That dead branch was misleading.
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const userRole: UserRole | null = this.authService.getRole();
    const allowedRoles: UserRole[] | undefined = route.data['roles'];

    // Only enforce role check when the route declares required roles
    if (allowedRoles && allowedRoles.length > 0) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        this.router.navigate(['/login']);
        return false;
      }
    }

    return true;
  }
}