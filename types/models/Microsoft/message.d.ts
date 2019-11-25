declare interface IOutlookMessage {
  status: string;
  id: string;
  isRead: boolean;
  snippet?: string;
  uniqueBody?: string;
  htmlBody?: string;
  textBody?: string;
  error?: string;
}
