CREATE OR REPLACE VIEW public.unread_notifications AS
 SELECT notifications.id,
    notifications.object,
    notifications.message,
    notifications.created_at,
    notifications.updated_at,
    notifications.room,
    notifications.action,
    notifications.object_class,
    notifications.subject,
    notifications.auxiliary_object_class,
    notifications.auxiliary_object,
    notifications.recommendation,
    notifications.auxiliary_subject,
    notifications.subject_class,
    notifications.auxiliary_subject_class,
    notifications.extra_subject_class,
    notifications.extra_object_class,
    notifications.deleted_at,
    notifications.specific,
    notifications.exclude,
    notifications_users."user",
    notifications."data",
    notifications.transports,
    notifications.phone_number
   FROM notifications
     JOIN notifications_users ON notifications.id = notifications_users.notification
     FULL JOIN notifications_deliveries ON notifications.id = notifications_deliveries.notification AND notifications_users."user" = notifications_deliveries."user"
  WHERE notifications_users.acked_at IS NULL AND notifications_deliveries.id IS NULL
