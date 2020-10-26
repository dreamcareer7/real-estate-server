export interface IStoredTemplateInstance extends IModel {
  template: UUID;
  html: string;
  file: UUID;
  branch?: string;

  deals: UUID[];
  listings: UUID[];
  contacts: UUID[];
}
