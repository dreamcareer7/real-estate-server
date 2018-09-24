CREATE OR REPLACE FUNCTION update_duplicate_pairs_for_brand(brand_id uuid)
RETURNS void
LANGUAGE SQL
AS $$
  WITH duplicate_attrs AS (
    SELECT
      text, array_agg(contact) ids
    FROM
      contacts_attributes AS ca
      JOIN contacts
        ON ca.contact = contacts.id
    WHERE
      contacts.deleted_at IS NULL
      AND ca.deleted_at IS NULL
      AND attribute_type IN ('email', 'phone_number')
      AND brand = $1::uuid
    GROUP BY
      text
  ), duplicate_clusters AS (
    SELECT
      ids
    FROM
      duplicate_attrs
    WHERE
      ARRAY_LENGTH(ids, 1) > 1
  )
  INSERT INTO
    contacts_duplicate_pairs (a, b, brand)
  SELECT DISTINCT
    a, b, $1
  FROM
    duplicate_clusters,
    compute_combinations(ids)
  ON CONFLICT
    DO NOTHING;
$$;