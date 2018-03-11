SELECT
  id as "notification",
  "object" as task,
  'unread_task_notification' as "type",
  "user"
FROM
  unread_notifications
WHERE
  specific = $1
  AND created_at >= NOW() - $1
  AND object_class = 'CrmTask'::notification_object_class
  AND (
    subject_class = 'CrmTask'::notification_object_class
    OR subject_class = 'Reminder'::notification_object_class
  )