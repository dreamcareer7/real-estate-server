declare interface INotification {
  id?: UUID;

  action: string;
  delay?: number;
  exclude?: UUID[];
  specific?: UUID;

  message?: string;
  image_url?: string

  notified_user?: UUID;
  room?: UUID;
  recommendation?: UUID;

  subject_class?: string;
  subject?: any;

  object_class: string;
  object: any;

  extra_object_class?: string;
  extra_subject_class?: string;

  auxiliary_object?: any;
  auxiliary_object_class?: string;
  auxiliary_subject?: any;
  auxiliary_subject_class?: string;
}

declare interface INotificationInput {
  id?: UUID;

  action: string;
  delay?: number;
  exclude?: UUID[];
  specific?: UUID;

  message: string;
  image_url?: string

  notified_user?: UUID;
  room?: UUID;
  recommendation?: UUID;


  subject_class?: string;
  subject?: UUID;

  object_class: string;
  object: UUID;

  extra_object_class?: string;
  extra_subject_class?: string;

  auxiliary_object?: UUID;
  auxiliary_object_class?: string;
  auxiliary_subject?: UUID;
  auxiliary_subject_class?: string;
}
