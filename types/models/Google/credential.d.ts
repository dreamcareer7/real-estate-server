declare interface IGoogleCredential extends IIntegrationCredential {
  email: string;
  resource_name: string;
  photo: string;
  messages_total: number;
  threads_total: number;
  history_id: number;
  cgroups_sync_token?: String;
  contacts_sync_token?: String;
  messages_sync_history_id: string;
  google_calendar: UUID;
  scope_summary?: string[];
  watcher_exp?: number;
  last_daily_sync?: Date;
  type?: String;
}