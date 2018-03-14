SELECT
  id,
  "object",
  'CrmTask' as object_class,
  "subject" as "user",
  'User' as subject_class,
  'notification' as "type"
FROM
  unread_notifications
WHERE
  created_at >= NOW() - $1
  AND object_class = 'CrmTask'::notification_object_class
  AND (
    subject_class = 'CrmTask'::notification_object_class
    OR subject_class = 'Reminder'::notification_object_class
  )