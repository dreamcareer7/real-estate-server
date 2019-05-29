INSERT INTO google_contacts
  (
    id,
    google_credential,
    meta
  )
VALUES %L
ON CONFLICT (id) DO UPDATE SET
  meta = excluded.meta
RETURNING id