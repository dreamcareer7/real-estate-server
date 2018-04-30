declare interface INotificationInput {
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
  subject?: UUID;
  subjects?: any[];

  object_class: string;
  object?: UUID;
  objects?: any[];

  extra_object_class?: string;
  extra_subject_class?: string;

  auxiliary_object?: UUID;
  auxiliary_object_class?: string;
  auxiliary_subject?: UUID;
  auxiliary_subject_class?: string;
}

declare interface INotification {
  id?: UUID;

  action: string;
  delay?: number;
  exclude?: UUID[];
  specific?: UUID;

  message: string;
  title: string;
  image_url?: string

  notified_user?: UUID;
  room?: UUID;
  recommendation?: UUID;

  subject_class?: string;
  subject?: UUID;
  subjects: any[];

  object_class: string;
  object: UUID;
  objects: any[];

  extra_object_class?: string;
  extra_subject_class?: string;

  auxiliary_object?: UUID;
  auxiliary_object_class?: string;
  auxiliary_subject?: UUID;
  auxiliary_subject_class?: string;
}
