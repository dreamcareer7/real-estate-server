interface ITypedRef {
  ref: UUID;
  type: string;
}

declare type TTaskStatus = "PENDING" | "DONE";
declare type TTaskType = "Call" | "Message" | "Todo";

declare interface ITask {
  title: string;
  description: string;
  due_date: number;
  status: TTaskStatus;
  task_type: TTaskType;

  reminders: IReminder[];

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