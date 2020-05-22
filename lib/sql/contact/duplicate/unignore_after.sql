UPDATE
  contacts_duplicate_pairs
SET
  ignored_at = NULL
WHERE
  ignored_at > $2::timestamptz
  AND brand = $1::uuid
