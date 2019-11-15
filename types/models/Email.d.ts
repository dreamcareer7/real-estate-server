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
  file: UUID;
  is_inline?: Boolean;
  content_id?: string;
}

declare type IEmailRecipientInput = 
  | IEmailRecipientEmailInput
  | IEmailRecipientListInput
  | IEmailRecipientTagInput
  | IEmailRecipientBrandInput
  | IEmailRecipientAgentInput;

declare type TIsTagPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientTagInput, 'tag'>;
declare type TIsListPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientListInput, 'list'>;
declare type TIsEmailPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientEmailInput, 'email'>;
declare type TIsBrandPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientBrandInput, 'brand'>;
declare type TIsAgentPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientAgentInput, 'agent'>;

declare interface IEmailRecipient {
  contact?: UUID;
  email: string;
}

declare interface IEmailCampaignInput {
  id?: UUID;
  due_at: string | null;
  created_by: UUID;
  brand: UUID;
  template?: UUID;
  from: UUID;
  to: IEmailRecipientInput[];
  cc?: IEmailRecipientInput[];
  bcc?: IEmailRecipientInput[];
  subject: string;
  html: string;
  text?: string;
  attachments?: IEmailCampaignAttachmentInput[];
  include_signature?: boolean;
  individual?: boolean;
  headers?: Record<string, string>;
  google_credential?: UUID;
  microsoft_credential?: UUID;
}

declare interface IEmailCampaign extends IEmailCampaignInput {
  text: string;
  id: UUID;
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
