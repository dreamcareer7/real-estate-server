export type TShowingRole =
  | 'Admin/Assistant'  
  | 'CoSellerAgent'
  | 'SellerAgent'
  | 'Tenant'
  | 'Other'
  ;

export interface ShowingRole {
  id: UUID;
  created_at: number;
  updated_at: number;
  deleted_at: number;
  created_by: number;
  showing: UUID;
  role: TShowingRole;
  user_id: UUID;
  agent_id: IAgent['id'] | null;
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: TNotificationDeliveryType[];
  cancel_notification_type: TNotificationDeliveryType[];
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
  role: TShowingRole;
  user_id: UUID;
  user: IUser;
  agent_id: IAgent['id'] | null;
  agent: IAgent | null;
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: TNotificationDeliveryType[];
  cancel_notification_type: TNotificationDeliveryType[];
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export interface ShowingRoleInput {
  role: TShowingRole;
  user?: UUID;
  agent?: IAgent['id'];
  brand: UUID;
  can_approve: boolean;
  confirm_notification_type: TNotificationDeliveryType[];
  cancel_notification_type: TNotificationDeliveryType[];
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}
