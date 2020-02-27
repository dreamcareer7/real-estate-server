INSERT INTO sso_users (
  "user", provider, foreign_id, profile, trusted_at
) VALUES (
  $1,
  $2,
  $3,
  $4,
  (
    CASE
      WHEN $5 IS TRUE THEN CLOCK_TIMESTAMP()
      ELSE NULL
    END
  )
)
ON CONFLICT(foreign_id, provider, "user") DO
UPDATE SET deleted_at = NULL, updated_at = CLOCK_TIMESTAMP()
WHERE sso_users.id = EXCLUDED.id
