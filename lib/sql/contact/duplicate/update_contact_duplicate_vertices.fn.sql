CREATE OR REPLACE FUNCTION update_contact_duplicate_vertices(user_id uuid, contact_ids uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
  DECLARE
    clusters int[];
    affected_contacts uuid[];
  BEGIN
    PERFORM update_duplicate_pairs_for_contacts($1, $2);

    SELECT
      array_agg(DISTINCT cluster) INTO clusters
    FROM
      contacts_duplicate_clusters
    WHERE
      contact = ANY($2);

    WITH d AS (
      /* Disband all the clusters */
      DELETE FROM
        contacts_duplicate_clusters
      WHERE
        cluster = ANY(clusters)
      RETURNING
        contact
    )
    SELECT
      array_agg(contact) INTO affected_contacts
    FROM (
      SELECT contact FROM d
      UNION
      SELECT unnest FROM unnest(contact_ids)
    ) t;

    /* Re-cluster all the affected contacts */
    PERFORM update_duplicate_clusters_for_contacts(affected_contacts);
  END;
$$