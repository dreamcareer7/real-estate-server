SELECT 'listing' AS TYPE,
       listings.*,
       EXTRACT(EPOCH FROM listings.dom) AS dom,
       EXTRACT(EPOCH FROM listings.cdom) AS cdom,
       EXTRACT(EPOCH FROM listings.created_at) AS created_at,
       EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at
FROM listings
WHERE listings.id = $1
