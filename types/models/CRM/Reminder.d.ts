declare interface IReminderInput {
  id?: UUID;

  time?: number;
  timestamp?: number;
  is_relative: boolean;
}

declare interface IReminder extends IReminderInput {
  created_at?: number;
  updated_at?: number;
  deleted_at?: number;

  notification?: UUID;
}
