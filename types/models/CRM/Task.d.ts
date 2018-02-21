interface ITypedRef {
  ref: UUID;
  type: string;
}

declare type TTaskStatus = "PENDING" | "DONE";
declare type TTaskType = "Call" | "Message" | "Todo";

declare interface ITask {
  id?: UUID;
  title: string;
  description: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  reminders: UUID[];

  assignee: UUID;
  contact: UUID;
  deal: UUID;
  listing: UUID;
}

declare interface ITaskInput {
  id?: UUID;
  title: string;
  description: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  reminders: IReminderInput[];

  assignee: UUID;
  contact: UUID;
  deal: UUID;
  listing: UUID;
}

declare interface ITaskFilters {
  assignee?: UUID;
  contact?: UUID;
  deal?: UUID;
  listing?: UUID;
  status?: TTaskStatus;
  task_type?: TTaskType;
  due_gte?: number;
  due_lte?: number;
}