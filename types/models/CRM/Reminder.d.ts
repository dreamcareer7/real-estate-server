interface IReminderInput {
  id?: UUID;

  timestamp: number;
  is_relative: true;
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
