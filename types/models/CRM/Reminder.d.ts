declare interface IReminder {
  created_at?: number;
  updated_at?: number;
  deleted_at?: number;

  notification?: UUID;

  time: number;
  is_relative: boolean;
  timestamp?: number;
}

declare interface IReminderInput {
  id?: UUID;

  time: number;
  is_relative: boolean;
}