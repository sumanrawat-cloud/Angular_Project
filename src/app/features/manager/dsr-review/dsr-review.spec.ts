import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DsrReview } from './dsr-review';

describe('DsrReview', () => {
  let component: DsrReview;
  let fixture: ComponentFixture<DsrReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DsrReview],
    }).compileComponents();

    fixture = TestBed.createComponent(DsrReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
