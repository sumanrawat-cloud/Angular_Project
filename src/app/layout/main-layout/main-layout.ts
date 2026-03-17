import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderComponent } from '../header/header';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';

const MOBILE_BP = '(max-width: 991px)';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatSidenavModule, SidebarComponent, HeaderComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  isMobile!: boolean;
  sidebarOpen!: boolean;

  private bpSub!: Subscription;
  private routeSub!: Subscription;

  constructor(private bp: BreakpointObserver, private router: Router) {
    this.isMobile    = this.bp.isMatched(MOBILE_BP);
    this.sidebarOpen = !this.isMobile;
  }

  ngOnInit(): void {
    this.bpSub = this.bp.observe([MOBILE_BP]).subscribe(result => {
      const nowMobile = result.matches;
      if (nowMobile === this.isMobile) return;
      this.isMobile = nowMobile;
      if (nowMobile) { this.sidenav?.close(); this.sidebarOpen = false; }
      else           { this.sidenav?.open();  this.sidebarOpen = true;  }
    });

    this.routeSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile && this.sidenav?.opened) {
          this.sidenav.close();
          this.sidebarOpen = false;
        }
      });
  }

  ngOnDestroy(): void { this.bpSub?.unsubscribe(); this.routeSub?.unsubscribe(); }

  toggleSidebar(): void {
    this.sidenav.toggle().then(() => { this.sidebarOpen = this.sidenav.opened; });
  }
}