declare type TNotificationApp =
  | 'showingapp'
  | 'rechat'
  ;

declare type TNotificationDeliveryType =
  | 'email'
  | 'push'
  | 'sms'
  ;

declare type TNotificationAction = 
  | 'Liked'
  | 'Composed'
  | 'Edited'
  | 'Added'
  | 'Removed'
  | 'Posted'
  | 'Favorited'
  | 'Changed'
  | 'Created'
  | 'Shared'
  | 'Arrived'
  | 'Toured'
  | 'Accepted'
  | 'Declined'
  | 'Joined'
  | 'Left'
  | 'Archived'
  | 'Deleted'
  | 'Opened'
  | 'Closed'
  | 'Pinned'
  | 'Sent'
  | 'Invited'
  | 'PriceDropped'
  | 'StatusChanged'
  | 'BecameAvailable'
  | 'TourRequested'
  | 'IsDue'
  | 'Assigned'
  | 'Withdrew'
  | 'Attached'
  | 'Detached'
  | 'Available'
  | 'CreatedFor'
  | 'ReactedTo'
  | 'Reviewed'
  | 'Rescheduled'
  | 'Canceled'
  | 'GaveFeedbackFor'
  | 'Confirmed'
  | 'Rejected';

declare type TNotificationObjectClass = 
  | 'Recommendation'
  | 'Listing'
  | 'Message'
  | 'Comment'
  | 'Room'
  | 'HotSheet'
  | 'Photo'
  | 'Video'
  | 'Document'
  | 'Tour'
  | 'Co-Shopper'
  | 'Price'
  | 'Status'
  | 'MessageRoom'
  | 'Shortlist'
  | 'User'
  | 'Alert'
  | 'Invitation'
  | 'Task'
  | 'Transaction'
  | 'Contact'
  | 'Attachment'
  | 'OpenHouse'
  | 'CreatedFor'
  | 'Recipient'
  | 'Envelope'
  | 'EnvelopeRecipient'
  | 'Submission'
  | 'Review'
  | 'AttachedFile'
  | 'Deal'
  | 'DealRole'
  | 'CrmTask'
  | 'Reminder'
  | 'ContactAttributeDef'
  | 'ContactList'
  | 'ContactAttribute'
  | 'DealContext'
  | 'ShowingAppointment'
  | 'ShowingRole';

declare interface INotificationInput {
  id?: UUID;

  action: TNotificationAction;
  delay?: number;
  exclude?: UUID[];
  specific?: UUID;

  title?: string;
  message?: string;
  image_url?: string

  notified_user?: UUID;
  room?: UUID;
  recommendation?: UUID;

  subject_class?: TNotificationObjectClass;
  subject?: UUID;
  subjects?: any[];

  object_class: TNotificationObjectClass;
  object?: UUID;
  objects?: any[];

  extra_object_class?: TNotificationObjectClass;
  extra_subject_class?: TNotificationObjectClass;

  auxiliary_object?: UUID;
  auxiliary_object_class?: TNotificationObjectClass;
  auxiliary_subject?: UUID;
  auxiliary_subject_class?: TNotificationObjectClass;

  data?: Record<string, any>;

  transports?: TNotificationDeliveryType[] | null;
  phone_number?: string | null;
  app?: TNotificationApp;
}

declare interface INotification {
  id?: UUID;

  action: TNotificationAction;
  delay?: number;
  exclude?: UUID[];
  specific?: UUID;

  message: string;
  title: string;
  image_url?: string
  data?: any;
  sound?: Object;

  notified_user?: UUID;
  room?: UUID;
  recommendation?: UUID;

  subject_class?: TNotificationObjectClass;
  subject?: UUID;
  subjects: any[];

  object_class: TNotificationObjectClass;
  object: UUID;
  objects: any[];

  extra_object_class?: TNotificationObjectClass;
  extra_subject_class?: TNotificationObjectClass;

  auxiliary_object?: any;
  auxiliary_object_class?: TNotificationObjectClass;
  auxiliary_subject?: any;
  auxiliary_subject_class?: TNotificationObjectClass;

  transports: TNotificationDeliveryType[] | null;
  phone_number: string | null;
}

declare interface INotificationPopulated<S, O> extends INotification {
  subjects: S[];
  objects: O[];
}
