INSERT INTO google_contact_groups
  (
    google_credential,
    resource_id,
    resource,
    resource_name
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4
  )
ON CONFLICT (google_credential, resource_id) DO UPDATE SET
  resource = $3,
  resource_name = $4
RETURNING id