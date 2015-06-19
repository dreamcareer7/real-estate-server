UPDATE recommendations t
SET hidden = TRUE
WHERE COALESCE(ARRAY_LENGTH(referring_alerts, 1), 0) = 0 AND
      referred_shortlist = $1 AND
      (SELECT message_room_status FROM message_rooms where id = t.message_room) = 'Inactive' AND
      (SELECT BOOL_OR(CASE WHEN status = 'Pinned' THEN TRUE ELSE FALSE END) FROM recommendations r WHERE t.referred_shortlist = $1 AND t.object = r.object) = FALSE
