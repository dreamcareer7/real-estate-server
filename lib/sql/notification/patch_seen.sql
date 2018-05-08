UPDATE notifications_users
SET seen_at = NOW()
WHERE "user" = $1 AND
      CASE
            WHEN $2::uuid[] IS NULL THEN
                  TRUE
            ELSE
                  notification = ANY($2::uuid[])
            END 

