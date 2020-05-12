INSERT INTO google_mail_labels
  (
    credential,
    labels
  )
VALUES
  (
    $1,
    $2
  )
ON CONFLICT (credential) DO UPDATE SET
  labels = $2,
  updated_at = now(),
  deleted_at = null
RETURNING id