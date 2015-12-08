SELECT(
    SELECT COUNT(*)
    FROM messages
    LEFT OUTER JOIN messages_acks ON
    messages.room = messages_acks.room AND
    messages_acks."user" = $2
    WHERE messages.room = $1 AND
          messages_acks.id IS NULL
) AS badge_count;
