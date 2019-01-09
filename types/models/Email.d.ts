declare interface IEmailRecipientInput {
  list?: UUID;
  tag?: string;
  email?: string;
  contact?: UUID;
}

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
