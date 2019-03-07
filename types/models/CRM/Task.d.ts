interface ITypedRef {
  ref: UUID;
  type: string;
}

declare type TTaskStatus = "PENDING" | "DONE";
declare type TTaskType = "Call" | "Email" | "Message" | "Other";
declare type TAccessActions = "read" | "write"
declare interface ITask extends ICrmAssociationsCategorized {
  id: UUID;
  title: string;
  description: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  notification?: UUID;
  assignees: UUID[];
  brand: UUID;
  created_by: UUID;
  created_at: number;
  updated_at: number;

  reminders: UUID[];
  associations?: UUID[];
  files?: any[];
}

declare interface ITaskInput {
  id?: UUID;
  title: string;
  description?: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  reminders?: IReminderInput[];
  associations?: ICrmAssociationInput[];
  assignees?: UUID[];

  metadata?: any;
}

declare interface ITaskFilters extends IAssociationFilters {
  q?: string;
  assignee?: UUID;
  created_by?: UUID;
  updated_by?: UUID;
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

declare interface ITaskAssigneeInput {
  crm_task: UUID;
  user: UUID;
}

declare interface ITaskAssignees {
  crm_task: UUID;
  users: UUID[];
}
