declare interface IEmailRecipientListInput {
  list: UUID;
  recipient_type: 'List';
}
declare interface IEmailRecipientTagInput {
  tag: string;
  recipient_type: 'Tag';
}
declare interface IEmailRecipientEmailInput {
  email: string;
  contact?: UUID;
  recipient_type: 'Email';
}

declare interface IEmailRecipientContactInput {
  contact: UUID;
  recipient_type: 'Contact';
}

declare interface IEmailRecipientBrandInput {
  brand: UUID;
  recipient_type: 'Brand';
}

declare interface IEmailRecipientAllContactsInput {
  recipient_type: 'AllContacts';
}

declare interface IEmailRecipientAgentInput {
  agent: UUID;
  recipient_type: 'Agent';
}

declare interface IEmailCampaignAttachmentInput {
  file?: UUID;
  url?: string;
  name?: string;
  is_inline?: Boolean;
  content_id?: string;
}

declare type IEmailRecipientInput = 
  | IEmailRecipientEmailInput
  | IEmailRecipientContactInput
  | IEmailRecipientListInput
  | IEmailRecipientTagInput
  | IEmailRecipientBrandInput
  | IEmailRecipientAgentInput
  | IEmailRecipientAllContactsInput
  ;

declare type TIsTagPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientTagInput, 'tag'>;
declare type TIsListPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientListInput, 'list'>;
declare type TIsEmailPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientEmailInput, 'email'>;
declare type TIsContactPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientContactInput, 'contact'>;
declare type TIsBrandPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientBrandInput, 'brand'>;
declare type TIsAgentPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientAgentInput, 'agent'>;

declare interface IEmailRecipient {
  contact?: UUID;
  email: string;
}

declare interface IEmailCampaignBase {
  id?: UUID;
  created_by: UUID;
  brand: UUID;
  template?: UUID;
  from: UUID;
  to: IEmailRecipientInput[];
  cc?: IEmailRecipientInput[];
  bcc?: IEmailRecipientInput[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: IEmailCampaignAttachmentInput[];
  include_signature?: boolean;
  individual?: boolean;
  headers?: Record<string, string>;
  google_credential?: UUID | null;
  microsoft_credential?: UUID | null;
  thread_key?: string;
  notifications_enabled?: boolean;
  archive?: boolean;
}

declare interface IEmailCampaignInput extends IEmailCampaignBase {
  due_at: string | null;
}

declare interface IEmailCampaign extends IEmailCampaignBase {
  text: string;
  id: UUID;
  failed_at?: string | null;
  failed_within?: string;
  failure?: string;
  opened: number;
  sent: number;
  due_at: number | null;
  executed_at: number;
  created_at: number;
  deleted_at?: number;
  recipients_count: number | null;
  tags?: string[];
}

declare interface IEmail {
  domain?: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  headers?: any;
}
