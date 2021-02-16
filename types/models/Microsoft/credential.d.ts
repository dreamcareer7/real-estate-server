declare interface IMicrosoftCredential extends IIntegrationCredential {
  email: string;
  remote_id: string;
  photo: string;
  id_token: string;
  ext_expires_in: number;
  microsoft_calendar: UUID;
  scope_summary: string[];
  send_email_after: number;
  type?: String;
  cfolders_sync_token?: String;
  contacts_sync_token?: String;
}