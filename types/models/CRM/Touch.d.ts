interface ITypedRef {
  ref: UUID;
  type: string;
}

declare type TTouchType = "Call" | "Message" | "Todo";
declare interface ITouch extends ICrmAssociationsCategorized {
  id: UUID;
  title: string;
  description: string;
  timestamp: number;
  activity_type: TTouchType;
  outcome?: string;

  brand: UUID;
  created_by: UUID;

  associations?: ICrmAssociation[];
  files?: any[];
}

declare interface ITouchInput {
  id?: UUID;
  title: string;
  description: string;
  timestamp: number;
  activity_type: TTouchType;
  outcome?: string;

  associations?: ICrmAssociationInput[];
}

declare interface ITouchFilters extends IAssociationFilters {
  q?: string;
  activity_type?: TTouchType;
  timestamp_gte?: number;
  timestamp_lte?: number;
}
