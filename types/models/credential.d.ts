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
  created_at: string;
  updated_at: string;
  deleted_at: string;
}
