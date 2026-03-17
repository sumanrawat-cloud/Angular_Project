// src/app/models.ts
export interface Task {
  id: string;
  name: string;
  description: string;
  hours: number;
  status: 'pending' | 'in-progress' | 'completed';
category?: string;
projectName?: string;
clientName?: string;
billable?: boolean;
}

export interface Risk {
  id: string;
  text: string;
  date: string;
  
}
