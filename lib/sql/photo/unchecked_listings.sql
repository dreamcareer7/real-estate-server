SELECT
  matrix_unique_id
FROM listings
WHERE
  photos_checked_at IS NULL
  AND
  status IN ('Active', 'Pending', 'Active Option Contract', 'Active Contingent', 'Active Kick Out')
LIMIT 100;