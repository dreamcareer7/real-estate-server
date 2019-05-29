INSERT INTO google_contact_groups
  (
    id,
    google_credential,
    meta
  )
VALUES
  (
    $1,
    $2,
    $3
  )
ON CONFLICT (id) DO UPDATE SET
  meta = $3
RETURNING id