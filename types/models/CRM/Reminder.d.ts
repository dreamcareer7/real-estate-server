interface IRelativeReminder {
  id?: UUID;

  time: number;
  is_relative: true;
}

interface IFixedReminder {
  id?: UUID;

  timestamp: number;
  is_relative: false;
}

declare type IReminderInput = IRelativeReminder | IFixedReminder;

declare interface IReminder {
  id?: UUID;

  time?: number;
  timestamp?: number;
  is_relative: boolean;

  created_at?: number;
  updated_at?: number;
  deleted_at?: number;

  notification?: UUID;
  task: UUID;
}
