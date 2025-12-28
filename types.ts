
export enum Category {
  ACADEMICS = 'Academics',
  DSWS = 'DSWS',
  BANDA = 'Banda',
  PERSONAL = 'Personal'
}

export enum Priority {
  URGENT = 'Urgent',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export enum Status {
  PENDING = 'Pending',
  BEGAN = 'Began',
  FINISHED = 'Finished'
}

export interface Task {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  status: Status;
  dueDate: string;
  remarks: string;
  link: string;
  createdAt: number;
}

export interface QuickNote {
  id: string;
  content: string;
  timestamp: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  timestamp: number;
}

export interface Link {
  id: string;
  label: string;
  url: string;
  groupId: string;
}

export interface LinkGroup {
  id: string;
  name: string;
}

export interface ClassCut {
  id: string;
  className: string;
  cutCount: number;
  maxCuts: number;
}

export interface CalendarAccount {
  id: string;
  email: string;
  calendarId: string;
  accountIndex: number; // Google account index (0, 1, 2 for /u/0, /u/1, etc)
  isActive: boolean;
}
