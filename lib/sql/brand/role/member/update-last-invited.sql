UPDATE
  brands_users
SET
  last_invited_at = NOW()
WHERE
  id = $1::uuid
