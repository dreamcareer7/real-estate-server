declare interface IMicrosoftThread {
  id: string;
  created_at: number;
  updated_at: number;

  microsoft_credential: UUID;
  subject?: string;
  first_message_date: number;
  last_message_date?: number;
  recipients: string[];
  message_count: number;
}
