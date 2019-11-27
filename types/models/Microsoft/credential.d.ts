declare interface IMicrosoftCredential extends IIntegrationCredential {
  email: string;
  remote_id: string;
  photo: string;
  id_token: string;
  ext_expires_in: number;
  contacts_last_sync_at: string;
  contacts_last_extract_at: string;
  messages_last_sync_at: string;
  scope_summary: string[];
}
