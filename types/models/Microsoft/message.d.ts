declare interface IOutlookMessage {
  status: number;
  id: string;
  isRead: boolean;
  snippet?: string;
  uniqueBody?: string;
  htmlBody?: string;
  textBody?: string;
  error?: string;
}
