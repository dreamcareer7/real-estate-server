export type NotificationDeliveryType =
  | 'email'
  | 'push'
  | 'sms'
  ;

export interface ShowingRole {
  id: UUID;
  created_at: number;
  updated_at: number;
  deleted_at: number;
  created_by: number;
  showing: UUID;
  role: TDealRole;
  user_id: UUID;
  agent_id: IAgent['id'] | null;
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: NotificationDeliveryType[];
  cancel_notification_type: NotificationDeliveryType[];
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export interface ShowingRolePopulated {
  id: UUID;
  created_at: number;
  updated_at: number;
  deleted_at: number;
  created_by: number;
  showing: UUID;
  role: TDealRole;
  user_id: UUID;
  user: IUser;
  agent_id: IAgent['id'];
  agent: IAgent | null;
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: NotificationDeliveryType[];
  cancel_notification_type: NotificationDeliveryType[];
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export interface ShowingRoleInput {
  role: TDealRole;
  user?: UUID;
  agent?: IAgent['id'];
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: NotificationDeliveryType[];
  cancel_notification_type: NotificationDeliveryType[];
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}
