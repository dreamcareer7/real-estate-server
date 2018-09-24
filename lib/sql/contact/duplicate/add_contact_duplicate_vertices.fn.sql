CREATE OR REPLACE FUNCTION add_contact_duplicate_vertices(brand_id uuid, contact_ids uuid[])
RETURNS contacts_duplicate_pairs
LANGUAGE SQL
AS $$
  SELECT update_duplicate_pairs_for_contacts($1, $2);
  SELECT update_duplicate_clusters_for_contacts($2);
  SELECT * FROM contacts_duplicate_pairs WHERE brand = brand_id;
$$