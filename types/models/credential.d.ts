declare interface IIntegrationCredential {
  id: UUID;
  user: UUID;
  brand: UUID;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string[];
  revoked: boolean;
  sync_status: string;
  last_sync_at: string;
  last_sync_duration: number;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}
