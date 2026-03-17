import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitDsr } from './submit-dsr';

describe('SubmitDsr', () => {
  let component: SubmitDsr;
  let fixture: ComponentFixture<SubmitDsr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitDsr],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitDsr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
