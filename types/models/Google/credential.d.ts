declare interface IGoogleCredential extends IIntegrationCredential {
  email: string;
  resource_name: string;
  photo: string;
  messages_total: number;
  threads_total: number;
  history_id: number;
  contacts_last_sync_at: string;
  messages_sync_history_id: string;
  threads_sync_history_id: string;
  rechat_gcalendar: UUID;
  calendars_last_sync_at: string;
  scope_summary?: string[];
}
