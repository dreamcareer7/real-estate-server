CREATE OR REPLACE FUNCTION search_listings(query text) RETURNS TABLE (
   "id" uuid,
   mls_number text,
   status listing_status
) AS
$$
  SELECT
    listings_filters.id as id,
    listings_filters.mls_number as mls_number,
    listings_filters.status as status

  FROM listings_filters

  WHERE
    to_tsvector('english', address) @@ plainto_tsquery('english', $1)
    OR
    address ILIKE '%' || $1 || '%'
    OR mls_number = $1

$$
LANGUAGE sql
STABLE