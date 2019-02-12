declare interface IEmailRecipientListInput {
  list: UUID;
}
declare interface IEmailRecipientTagInput {
  tag: string;
}
declare interface IEmailRecipientEmailInput {
  email: string;
  contact?: UUID;
}

declare type IEmailRecipientInput = 
  | IEmailRecipientEmailInput
  | IEmailRecipientListInput
  | IEmailRecipientTagInput;

declare type TIsTagPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientTagInput, 'tag'>;
declare type TIsListPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientListInput, 'list'>;
declare type TIsEmailPresent = TIsPropertyPresent<IEmailRecipientInput, IEmailRecipientEmailInput, 'email'>;

declare interface IEmailRecipient {
  contact?: UUID;
  email: string;
}

declare interface IEmailCampaign {
  from: UUID;
  to: IEmailRecipientInput[];
  subject: string;
  html: string;
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

declare interface IContactEmail {
  email: UUID;
  contact: UUID;
  user: UUID;
}
