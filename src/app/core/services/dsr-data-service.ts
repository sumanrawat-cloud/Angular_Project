import { Injectable } from '@angular/core';

export interface DsrTimeCategory {
  key:          string;
  label:        string;
  icon:         string;
  hours:        number;
  color:        string;
  description?: string;
  isAutoCalc?:  boolean;
}

export interface DsrPayload {
  dsrDate:           Date;
  allowBackfill:     boolean;
  client:            string;
  project:           string;
  taskStatus:        string;
  atRiskDescription?: string;
  timeByCategory:    Record<string, number>;
  timeCategories:    DsrTimeCategory[];
  tasksCompleted:    number;
  completionPercent: number;
  totalHours:        number;
  blockers?:         string;
  tomorrowPlan?:     string;
  submittedAt:       Date;
}

@Injectable({ providedIn: 'root' })
export class DsrDataService {
  private _payload: DsrPayload | null = null;

  save(data: DsrPayload): void {
    this._payload = data;
  }

  load(): DsrPayload | null {
    return this._payload;
  }

  reset(): void {
    this._payload = null;
  }
}