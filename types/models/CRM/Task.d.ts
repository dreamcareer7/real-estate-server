interface ITypedRef {
  ref: UUID;
  type: string;
}

declare interface ITask {
  title: string;
  description: string;
  due_date: number;
  status: "PENDING" | "DONE";
  task_type: "Call", "Message", "Todo";

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
}