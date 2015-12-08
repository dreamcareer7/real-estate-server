SELECT id
FROM invitation_records
WHERE deleted_at is NULL AND
      invited_user = $1 AND
      CASE WHEN $2 = 'Room' THEN (room IS NOT NULL)
      ELSE TRUE
      END
