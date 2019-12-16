declare interface outlookAttachments {
  id?: string;
  name?: string;
  contentType?: string;
  size?: number;
  isInline?: boolean,
  url?: string
}

declare interface IOutlookMessage {
  status: number;
  id: string;
  isRead: boolean;
  snippet?: string;
  uniqueBody?: string;
  htmlBody?: string;
  textBody?: string;
  error?: string;
  attachments?: outlookAttachments[];
}
