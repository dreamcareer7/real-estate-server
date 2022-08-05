CREATE OR REPLACE FUNCTION update_duplicate_pairs_for_contacts(brand_id uuid, contact_ids uuid[])
RETURNS void
LANGUAGE SQL
AS $$
  DELETE FROM
    contacts_duplicate_pairs
  WHERE
    ignored_at IS NULL
    AND (
      a = ANY($2)
      OR b = ANY($2)
    );

  WITH attrs AS (
    SELECT
      text
    FROM
      contacts_attributes_text AS ca
    WHERE
      ca.deleted_at IS NULL
      AND attribute_type = 'email'
      AND contact = ANY($2)
  ), duplicate_clusters AS (
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
    HAVING ARRAY_LENGTH(array_agg(contact), 1) > 1
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
