SELECT
  id,
  template,
  (
    SELECT id FROM brands
    WHERE brand_type = 'Brokerage'
    AND deleted_at IS NULL
    AND id IN (
      SELECT brand_parents(bat.brand)
    )
    LIMIT 1
  ) as brand
FROM brands_allowed_templates bat
WHERE thumbnail_requested_at IS NOT NULL
LIMIT 20 -- We want to take small bites.
