interface ITypedRef {
  ref: UUID;
  type: string;
}

declare type TTaskStatus = "PENDING" | "DONE";
declare type TTaskType = "Call" | "Message" | "Todo";
declare type TAccessActions = "read" | "update" | "delete"
declare interface ITask {
  id: UUID;
  title: string;
  description: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  contacts: UUID[];
  deals: UUID[];
  listings: UUID[];

  reminders: UUID[];

  assignee: UUID;
  associations?: ICrmAssociation[];
}

declare interface ITaskInput {
  id?: UUID;
  title: string;
  description: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  reminders: IReminderInput[];
  associations?: ICrmAssociationInput[];

  assignee: UUID;
}

declare interface ITaskFilters extends IAssociationFilters {
  assignee?: UUID;
  status?: TTaskStatus;
  task_type?: TTaskType;
  due_gte?: number;
  due_lte?: number;
}