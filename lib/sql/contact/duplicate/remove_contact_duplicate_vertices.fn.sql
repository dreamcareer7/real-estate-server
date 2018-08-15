CREATE OR REPLACE FUNCTION remove_contact_duplicate_vertices(uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
  DECLARE
    clusters int[];
    affected_contacts uuid[];
  BEGIN
    DELETE FROM
      contacts_duplicate_pairs
    WHERE
      a = ANY($1)
      OR b = ANY($1);

    SELECT
      array_agg(DISTINCT cluster) INTO clusters
    FROM
      contacts_duplicate_clusters
    WHERE
      contact = ANY($1);

    DELETE FROM
      contacts_duplicate_clusters
    WHERE
      contact = ANY($1);

    WITH d AS (
      DELETE FROM
        contacts_duplicate_clusters
      WHERE
        cluster = ANY(clusters)
      RETURNING
        contact
    )
    SELECT
      array_agg(contact) INTO affected_contacts
    FROM
      d;

    PERFORM update_duplicate_clusters_for_contacts(affected_contacts);
  END;
$$