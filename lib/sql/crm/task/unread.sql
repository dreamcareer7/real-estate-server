SELECT
  id,
  "action",
  "object",
  'CrmTask' as object_class,
  "subject" as auxiliary_subject,
  "subject_class" as auxiliary_subject_class,
  "user" as "subject",
  'User' as subject_class,
  'notification' as "type"
FROM
  unread_notifications
WHERE
  created_at BETWEEN (NOW() - interval '6 hours') AND (NOW() - $1::interval)
  AND object_class = 'CrmTask'::notification_object_class
  AND subject_class = ANY('{CrmTask,Reminder,User}'::notification_object_class[])
