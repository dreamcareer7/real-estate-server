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
ON CONFLICT (google_credential, resource_name) DO UPDATE SET
  meta = $3
RETURNING id