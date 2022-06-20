-- $1 transport: notification_delivery_type
-- $2 [object_class]: notification_object_class
-- $3 [max_age]: interval

WITH deliveries AS (
  SELECT
    *
  FROM
    notifications_deliveries
  WHERE
    type = $1::text AND
    deleted_at IS NULL
)
SELECT
  'notification' AS type,
  n.id,
  n.object,
  n.message,
  n.created_at,
  n.updated_at,
  n.room,
  n.action,
  n.object_class,
  n.subject,
  n.auxiliary_object_class,
  n.auxiliary_object,
  n.recommendation,
  n.auxiliary_subject,
  n.subject_class,
  n.auxiliary_subject_class,
  n.extra_subject_class,
  n.extra_object_class,
  n.deleted_at,
  n.specific,
  n.exclude,
  nu."user",
  n."data",
  n.transports,
  n.phone_number
FROM notifications AS n
  JOIN notifications_users AS nu ON n.id = nu.notification
  LEFT JOIN deliveries AS d ON n.id = d.notification AND nu."user" = d."user"
WHERE
  n.deleted_at IS NULL AND
  nu.acked_at IS NULL AND
  d.id IS NULL AND
  ($2::notification_object_class IS NULL OR
   n.object_class = $2::notification_object_class) AND
  ($3::interval IS NULL OR
   n.created_at >= now() - $3::interval) AND
  (n.transports IS NULL OR $1::notification_delivery_type = ANY(n.transports))
