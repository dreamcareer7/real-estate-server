INSERT INTO microsoft_mail_folders
  (
    credential,
    folders
  )
VALUES
  (
    $1,
    $2
  )
ON CONFLICT (credential) DO UPDATE SET
  folders = $2,
  updated_at = now(),
  deleted_at = null
RETURNING id