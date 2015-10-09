SELECT id
FROM invitation_records
WHERE room = $1 AND
      deleted_at is NULL
