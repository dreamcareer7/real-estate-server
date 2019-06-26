INSERT INTO google_contact_groups
  (
    google_credential,
    entry_id,
    entry
  )
VALUES
  (
    $1,
    $2,
    $3
  )
ON CONFLICT (google_credential, entry_id) DO UPDATE SET
  entry = $3
RETURNING id