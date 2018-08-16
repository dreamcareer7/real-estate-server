WITH ignored AS (
  UPDATE
    contacts_duplicate_pairs
  SET
    ignored_at = NOW()
  WHERE
    "user" = $1::uuid
    AND a = $2::uuid
    AND b = $3::uuid
  RETURNING
    b
)
UPDATE
  contacts
SET
  duplicate_cluster_id = nextval('contact_duplicate_cluster_seq')
WHERE
  