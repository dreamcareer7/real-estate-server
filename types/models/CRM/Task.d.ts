interface ITypedRef {
  ref: UUID;
  type: string;
}

declare type TTaskStatus = "PENDING" | "DONE";
declare type TTaskType = "Call" | "Message" | "Todo";
declare type TAccessActions = "read" | "update" | "delete"
declare interface ITask extends ICrmAssociationsCategorized {
  id: UUID;
  title: string;
  description: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  notification?: UUID;
  assignee: UUID;
  brand: UUID;
  created_by: UUID;

  reminders: UUID[];
  associations?: ICrmAssociation[];
  files?: any[];
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
  brand?: UUID;
}

declare interface ITaskFilters extends IAssociationFilters {
  q?: string;
  assignee?: UUID;
  user?: UUID;
  brand?: UUID;
  status?: TTaskStatus;
  task_type?: TTaskType;
  due_gte?: number;
  due_lte?: number;
}

declare interface IUnreadTaskNotification {
  notification: UUID;
  task: ITask;
  user: IUser;
}
