interface ITypedRef {
  ref: UUID;
  type: string;
}

declare type TCrmActivityType = "Call" | "Message" | "Todo";
declare interface ICrmActivity extends ICrmAssociationsCategorized {
  id: UUID;
  title: string;
  description: string;
  timestamp: number;
  activity_type: TCrmActivityType;
  outcome?: string;

  brand: UUID;
  created_by: UUID;

  associations?: ICrmAssociation[];
  files?: any[];
}

declare interface ICrmActivityInput {
  id?: UUID;
  title: string;
  description: string;
  timestamp: number;
  activity_type: TCrmActivityType;
  outcome?: string;

  associations?: ICrmAssociationInput[];
}

declare interface ICrmActivityFilters extends IAssociationFilters {
  q?: string;
  activity_type?: TCrmActivityType;
  timestamp_gte?: number;
  timestamp_lte?: number;
}
