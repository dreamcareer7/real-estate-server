SELECT
  id,
  "object",
  object_class,
  subject,
  subject_class,
  "user" as "auxiliary_subject",
  'User' as auxiliary_subject_class,
  "data",
  'notification' as "type"
FROM
  unread_notifications
WHERE
  created_at <= NOW() - $1::interval
  AND ((
    object_class = 'Contact'::notification_object_class
    AND subject_class = 'ContactAttribute'::notification_object_class
  ) OR (
    object_class = 'Deal'::notification_object_class
    AND subject_class = 'DealContext'::notification_object_class
  ))
