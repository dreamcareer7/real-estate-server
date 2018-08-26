CREATE OR REPLACE FUNCTION update_duplicate_clusters_for_brand(brand_id uuid)
RETURNS int
LANGUAGE plpgsql
AS $$
  DECLARE
    pair RECORD;
    a_cid int;
    b_cid int;
    duplicate_count int;
  BEGIN
    FOR pair IN SELECT * FROM contacts_duplicate_pairs WHERE ignored_at IS NULL AND brand = $1 LOOP
      SELECT cluster INTO a_cid FROM contacts_duplicate_clusters WHERE contact = pair.a LIMIT 1;
      SELECT cluster INTO b_cid FROM contacts_duplicate_clusters WHERE contact = pair.b LIMIT 1;

      IF a_cid IS NOT NULL AND a_cid = b_cid THEN
        CONTINUE;
      ELSIF a_cid IS NOT NULL AND b_cid IS NOT NULL THEN
        -- raise notice 'Joining % AND % clusters', a_cid, b_cid;
        UPDATE
          contacts_duplicate_clusters
        SET
          cluster = CASE WHEN a_cid > b_cid THEN a_cid ELSE b_cid END
        WHERE
          cluster = CASE WHEN a_cid > b_cid THEN b_cid ELSE a_cid END;
      ELSIF a_cid IS NOT NULL OR b_cid IS NOT NULL THEN
        -- raise notice 'Adding a contact to cluster %', COALESCE(b_cid, a_cid);
        UPDATE
          contacts_duplicate_clusters
        SET
          cluster = COALESCE(b_cid, a_cid)
        WHERE
          contact = CASE WHEN a_cid IS NULL THEN pair.a ELSE pair.b END;
      ELSE
        PERFORM nextval('contact_duplicate_cluster_seq');

        -- raise notice 'Adding a contact to cluster %', currval('contact_duplicate_cluster_seq');

        INSERT INTO
          contacts_duplicate_clusters (contact, cluster)
        VALUES
          (pair.a, currval('contact_duplicate_cluster_seq')),
          (pair.b, currval('contact_duplicate_cluster_seq'));
      END IF;
    END LOOP;

    SELECT
      count(DISTINCT cluster) INTO duplicate_count
    FROM
      contacts_duplicate_clusters
      JOIN contacts
        ON id = contact
    WHERE
      brand = brand_id;

    RETURN duplicate_count;
  END;
$$;