INSERT INTO google_contact_groups
  (
    google_credential,
    resource_name,
    meta
  )
VALUES
  (
    $1,
    $2,
    $3
  )
ON CONFLICT (resource_name) DO UPDATE SET
  google_credential = $1,
  meta = $3
RETURNING id