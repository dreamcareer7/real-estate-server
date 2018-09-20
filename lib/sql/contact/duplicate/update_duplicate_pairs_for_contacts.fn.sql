CREATE OR REPLACE FUNCTION update_duplicate_pairs_for_contacts(brand_id uuid, contact_ids uuid[])
RETURNS void
LANGUAGE SQL
AS $$
  DELETE FROM
    contacts_duplicate_pairs
  WHERE
    a = ANY($2)
    OR b = ANY($2);

  WITH attrs AS (
    SELECT
      text
    FROM
      contacts_attributes AS ca
    WHERE
      ca.deleted_at IS NULL
      AND attribute_type IN ('email', 'phone_number')
      AND contact = ANY($2)
  ), duplicate_attrs AS (
    SELECT
      text, array_agg(contact) ids
    FROM
      contacts_attributes AS ca
      JOIN contacts
        ON ca.contact = contacts.id
    WHERE
      contacts.deleted_at IS NULL
      AND ca.deleted_at IS NULL
      AND text IN (SELECT text FROM attrs)
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
    contacts_duplicate_pairs
  SELECT DISTINCT
    a, b, brand_id AS brand
  FROM
    duplicate_clusters,
    compute_combinations(ids)
  ON CONFLICT
    DO NOTHING;
$$;