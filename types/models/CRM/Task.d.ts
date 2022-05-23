interface ITypedRef {
  ref: UUID
  type: string
}

declare type TTaskStatus = 'PENDING' | 'DONE'
declare type TTaskType =
  | 'Call'
  | 'Email'
  | 'Message'
  | 'Mail'
  | 'Open House'
  | 'Tour'
  | 'In-Person Meeting'
  | 'Showing'
  | 'Note'
  | 'Other'
declare type TAccessActions = 'read' | 'write'
declare interface ITask extends ICrmAssociationsCategorized {
  id: UUID
  title: string
  description: string
  due_date: number
  end_date: number
  status: TTaskStatus
  task_type: TTaskType

  notification?: UUID
  assignees: UUID[]
  brand: UUID
  created_by: UUID
  created_at: number
  updated_at: number

  reminders: UUID[]
  associations?: UUID[]
  files?: any[]
  all_day: Boolean
  metadata: any
}

declare interface ITaskInput {
  id?: UUID

  brand?: UUID
  created_by?: UUID

  title: string
  description?: string
  due_date: number
  end_date?: number
  status: TTaskStatus
  task_type: TTaskType
  
  reminders?: IReminderInput[]
  associations?: ICrmTaskAssociationInput[]
  assignees?: UUID[]
  
  metadata?: any;
  all_day?: Boolean
}

declare type TBaseTaskInputKeys = 'title' | 'description' | 'status' | 'due_date' | 'end_date' | 'task_type' | 'metadata';
declare type IBaseTaskInput = Pick<ITaskInput, TBaseTaskInputKeys>;

declare interface ICrmTaskAssociationInputBase {
  index?: number
  metadata?: any
}

declare interface ICrmTaskAssociationInputListing extends ICrmTaskAssociationInputBase {
  association_type: 'listing'
  listing: UUID
}

declare interface ICrmTaskAssociationInputContact extends ICrmTaskAssociationInputBase {
  association_type: 'contact'
  contact: UUID
}

declare interface ICrmTaskAssociationInputDeal extends ICrmTaskAssociationInputBase {
  association_type: 'deal'
  deal: UUID
}

declare interface ICrmTaskAssociationInputEmail extends ICrmTaskAssociationInputBase {
  association_type: 'email'
  email: UUID
}

declare type ICrmTaskAssociationInput =
  | ICrmTaskAssociationInputContact
  | ICrmTaskAssociationInputDeal
  | ICrmTaskAssociationInputListing
  | ICrmTaskAssociationInputEmail

declare type ICrmTaskAssociationInputWithId = ICrmTaskAssociationInput & { id?: UUID }

declare interface ITaskFilters extends IAssociationFilters {
  q?: string
  title?: string
  assignee?: UUID
  created_by?: UUID
  updated_by?: UUID
  brand?: UUID
  status?: TTaskStatus
  task_type?: TTaskType
  due_gte?: number
  due_lte?: number
}

declare interface IUnreadTaskNotification {
  notification: UUID
  task: ITask
  user: IUser
}

declare interface ITaskAssigneeInput {
  crm_task: UUID
  user: UUID
  created_by: UUID
}

declare interface ITaskAssignees {
  crm_task: UUID
  users: UUID[]
}
