interface IReminderInput {
  id?: UUID;
  task?: UUID;
  timestamp: number;
  is_relative: true;
  needs_notification?: boolean;
}

declare interface IReminder {
  id: UUID;

  time?: number;
  timestamp?: number;
  is_relative: boolean;

  created_at?: number;
  updated_at?: number;
  deleted_at?: number;

  notification?: UUID;
  task: UUID;
}
