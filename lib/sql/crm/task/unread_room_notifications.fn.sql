CREATE OR REPLACE FUNCTION
      unread_room_notifications(interval) RETURNS TABLE (
        room uuid,
        "user" uuid,
        first_unread double precision,
        last_unread timestamptz
      )
    AS $$
    SELECT
      room,
      "user",
      EXTRACT( -- Time of the first unread notification for this user on this room.
        EPOCH FROM ((array_agg(created_at ORDER BY created_at  ASC))[1]::timestamptz)
      ) as first_unread,
      (
        (array_agg(created_at ORDER BY created_at DESC))[1]
      ) as last_unread
    FROM
      unread_notifications
    WHERE
      created_at >= (NOW() - $1)
      AND room IS NOT NULL
    GROUP BY
      "user",
      room
    $$
    LANGUAGE SQL STABLE