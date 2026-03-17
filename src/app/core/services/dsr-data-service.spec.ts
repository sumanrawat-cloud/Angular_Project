import { TestBed } from '@angular/core/testing';

import { DsrDataService } from './dsr-data-service';

describe('DsrDataService', () => {
  let service: DsrDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DsrDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
