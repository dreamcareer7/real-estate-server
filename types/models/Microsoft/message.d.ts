declare interface IOutlookAttachment {
  id?: string;
  name?: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  url?: string;
  cid?: string;
  contentId?: string;
  type: 'microsoft_message_attachment'
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
  attachments?: IOutlookAttachment[];
}
