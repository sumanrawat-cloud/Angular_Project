import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DsrDetail } from './dsr-detail';

describe('DsrDetail', () => {
  let component: DsrDetail;
  let fixture: ComponentFixture<DsrDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DsrDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(DsrDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
