CREATE OR REPLACE FUNCTION update_duplicates_for_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
  DECLARE
    last_created_group_id int;
    pair RECORD;
    a_cid int;
    b_cid int;
  BEGIN
    CREATE TEMP TABLE pairs (
      a uuid,
      b uuid
    ) ON COMMIT DROP;

    CREATE INDEX pairs_left_idx ON pairs (a);
    CREATE INDEX pairs_right_idx ON pairs (b);
    
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
        AND "user" = $1::uuid
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
      pairs
    SELECT DISTINCT
      a, b
    FROM
      duplicate_attrs,
      compute_combinations(ids);

    FOR pair IN SELECT * FROM pairs ORDER BY a LOOP
      SELECT duplicate_cluster_id INTO a_cid FROM contacts WHERE id = pair.a AND duplicate_cluster_id IS NOT NULL LIMIT 1;
      SELECT duplicate_cluster_id INTO b_cid FROM contacts WHERE id = pair.b AND duplicate_cluster_id IS NOT NULL LIMIT 1;

      IF a_cid IS NOT NULL AND b_cid IS NOT NULL THEN
        UPDATE
          contacts
        SET
          duplicate_cluster_id = CASE WHEN a_cid > b_cid THEN a_cid ELSE b_cid END
        WHERE
          duplicate_cluster_id = CASE WHEN a_cid > b_cid THEN b_cid ELSE a_cid END;
      ELSIF a_cid IS NOT NULL OR b_cid IS NOT NULL THEN
        UPDATE
          contacts
        SET
          duplicate_cluster_id = COALESCE(b_cid, a_cid)
        WHERE
          id = CASE WHEN a_cid IS NULL THEN pair.a ELSE pair.b END;
      ELSE
        PERFORM nextval('contact_duplicate_cluster_seq');

        UPDATE
          contacts
        SET
          duplicate_cluster_id = currval('contact_duplicate_cluster_seq')
        WHERE
          id = pair.a OR id = pair.b;
      END IF;
    END LOOP;
  END;
$$;