SELECT DISTINCT (listings.id)
FROM listings
INNER JOIN properties
ON listings.property_id = properties.id
WHERE
    listings.price >= $2 AND
    listings.price <= $3 AND
    properties.square_meters >= $4 AND
    properties.square_meters <= $5 AND
    properties.bedroom_count >= $6 AND
    ((properties.half_bathroom_count + properties.full_bathroom_count) >= $7) AND
    properties.property_type = $8 AND
    properties.property_subtype = ANY ($9::property_subtype[]) AND
    listings.id NOT IN (
      SELECT DISTINCT(recommendations.object)
      FROM recommendations
      WHERE recommendations.referred_shortlist = $1
    )
