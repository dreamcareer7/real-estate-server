import { EventEmitter } from 'events'

interface ICrmTaskEventArgs {
  user_id: UUID;
  brand_id: UUID;
  task_ids: UUID[];
}

declare class CrmTaskEventEmitter extends EventEmitter {
  emit(event: 'create', args: ICrmTaskEventArgs): boolean
  emit(event: 'update', args: ICrmTaskEventArgs): boolean
  emit(event: 'update:due_date', args: ICrmTaskEventArgs): boolean
  emit(event: 'update:status', args: ICrmTaskEventArgs): boolean
  emit(event: 'delete', args: ICrmTaskEventArgs): boolean

  emit(event: string, args: ICrmTaskEventArgs): boolean;

  on(event: 'create', listener: (args: ICrmTaskEventArgs) => void): this
  on(event: 'delete', listener: (args: ICrmTaskEventArgs) => void): this

  on(event: 'update', listener: (args: ICrmTaskEventArgs) => void): this
  on(event: 'update:due_date', listener: (args: ICrmTaskEventArgs) => void): this
  on(event: 'update:status', listener: (args: ICrmTaskEventArgs) => void): this
}

export = CrmTaskEventEmitter
