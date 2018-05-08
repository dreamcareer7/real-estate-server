CREATE OR REPLACE FUNCTION get_attr_indices_for_contact(contact_id uuid) RETURNS TABLE (
  id uuid,
  ord smallint
)
LANGUAGE SQL
STABLE
AS $$
  WITH ua AS (
    SELECT array_agg(created_at) as attrs
    FROM (
      SELECT DISTINCT created_at FROM
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
      AND contact = contact_id
    ) foo
  )
  SELECT id, ord::smallint
  FROM ua, unnest(ua.attrs) WITH ORDINALITY t(created_at, ord)
  JOIN contacts_attributes USING (created_at)
$$;

UPDATE
  contacts_attributes
SET
  index = uv.ord
FROM (
  SELECT attr_indices.* FROM
  contacts,
  get_attr_indices_for_contact(contacts.id) attr_indices
) AS uv
WHERE
  uv.id = contacts_attributes.id;