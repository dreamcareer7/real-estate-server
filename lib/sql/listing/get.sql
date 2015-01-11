SELECT 'listing' AS TYPE,
       listings.*,
       EXTRACT(EPOCH
               FROM listings.created_at)::INT AS created_at,
       EXTRACT(EPOCH
               FROM listings.updated_at)::INT AS updated_at
FROM listings
WHERE listings.id = $1
