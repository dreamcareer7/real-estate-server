UPDATE
  contacts_duplicate_pairs AS cdp
SET
  ignored_at = NOW()
WHERE
  cdp.brand = $1::uuid
  AND ignored_at IS NULL
RETURNING
  cdp.a, cdp.b
