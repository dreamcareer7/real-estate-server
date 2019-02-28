CREATE OR REPLACE FUNCTION search_listings(query tsquery) RETURNS TABLE (
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
    to_tsvector('english', address)    @@ $1::tsquery

$$
LANGUAGE sql
STABLE
