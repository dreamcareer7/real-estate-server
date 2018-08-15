CREATE OR REPLACE FUNCTION add_contact_duplicate_vertices(user_id uuid, contact_ids uuid[])
RETURNS void
LANGUAGE SQL
AS $$
  SELECT update_duplicate_pairs_for_contacts($1, $2);
  SELECT update_duplicate_clusters_for_contacts($2);
$$