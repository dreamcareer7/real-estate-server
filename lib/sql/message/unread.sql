SELECT
  "user",

  JSON_AGG(
    JSON_BUILD_OBJECT(
      'room',
      u.room,
      'first_unread',
      u.first_unread,
      'last_unread',
      u.last_unread,
      'notification_setting',
      (
        SELECT notification_setting FROM rooms_users
        WHERE room = u.room AND "user" = u.user
      )
    )
  ) as rooms

FROM unread_room_notifications($2::interval) AS u
GROUP BY "user"

HAVING (array_agg(u.last_unread ORDER BY u.last_unread DESC))[1] < (CLOCK_TIMESTAMP() - $1::interval)