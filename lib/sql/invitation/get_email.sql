SELECT id
FROM invitation_records
WHERE LOWER(email) = LOWER($1) AND
      deleted_at IS NULL
