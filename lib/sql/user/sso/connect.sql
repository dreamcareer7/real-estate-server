INSERT INTO sso_users (
  "user", source, foreign_id, profile
) VALUES (
$1,
(
  SELECT id FROM sso_providers WHERE identifier = $2
),
$3,
$4)
