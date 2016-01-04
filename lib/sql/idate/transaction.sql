SELECT id
FROM important_dates
WHERE "transaction" = $1 AND
      deleted_at IS NULL
