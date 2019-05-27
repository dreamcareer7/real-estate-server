INSERT INTO google_contacts
  (
    google_credential,
    resource_name,
    meta
  )
VALUES %L
ON CONFLICT (resource_name) DO UPDATE SET
  meta = excluded.meta
RETURNING id