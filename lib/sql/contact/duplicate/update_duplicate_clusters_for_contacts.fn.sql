CREATE OR REPLACE FUNCTION update_duplicate_clusters_for_contacts(uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
  DECLARE
    pair RECORD;
    a_cid int;
    b_cid int;
    pair_count RECORD;
  BEGIN
    FOR pair IN SELECT * FROM contacts_duplicate_pairs WHERE ignored_at IS NULL AND (a = ANY($1) OR b = ANY($1)) LOOP
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
        -- raise notice 'Adding % to cluster %', (CASE WHEN a_cid IS NULL THEN pair.a ELSE pair.b END), COALESCE(b_cid, a_cid);
        INSERT INTO
          contacts_duplicate_clusters
        VALUES
          (CASE WHEN a_cid IS NULL THEN pair.a ELSE pair.b END, COALESCE(b_cid, a_cid));
      ELSE
        PERFORM nextval('contact_duplicate_cluster_seq');

        -- raise notice 'Create a new cluster % for two contacts', currval('contact_duplicate_cluster_seq');

        INSERT INTO
          contacts_duplicate_clusters (contact, cluster)
        VALUES
          (pair.a, currval('contact_duplicate_cluster_seq')),
          (pair.b, currval('contact_duplicate_cluster_seq'));
      END IF;
    END LOOP;
  END;
$$;