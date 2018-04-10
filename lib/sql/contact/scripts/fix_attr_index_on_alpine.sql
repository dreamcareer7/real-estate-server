UPDATE
  contacts_attributes
SET
  index = uv.ord
FROM (
  WITH ua AS (
    SELECT array_agg(created_at) as attrs
    FROM (
      SELECT created_at FROM
        contacts_attributes_with_name
      WHERE "name" IN (
        'state',
        'city',
        'postal_code',
        'country',
        'zip_code',
        'street_name',
        'street_number',
        'street_prefix',
        'street_suffix',
        'unit_number'
      )
      GROUP BY created_at
    ) foo
  )
  SELECT id, ord
  FROM ua, unnest(ua.attrs) WITH ORDINALITY t(created_at, ord)
  JOIN contacts_attributes_with_name USING (created_at)
) AS uv
WHERE
  uv.id = contacts_attributes.id;