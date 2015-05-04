SELECT DISTINCT (listings.id)
FROM listings
INNER JOIN properties
ON listings.property_id = properties.id
INNER JOIN addresses
ON properties.address_id = addresses.id
WHERE
    listings.price >= $2 AND
    listings.price <= $3 AND
    properties.square_meters >= $4 AND
    properties.square_meters <= $5 AND
    properties.bedroom_count >= $6 AND
    ((properties.half_bathroom_count + properties.full_bathroom_count) >= $7) AND
    properties.property_type = $8 AND
    properties.property_subtype = ANY ($9::property_subtype[]) AND
    ST_Distance(ST_SetSRID(ST_MakePoint($10, $11), 4326), addresses.location, TRUE) < 10000 AND
    listings.id NOT IN (
      SELECT DISTINCT(recommendations.object)
      FROM recommendations
      WHERE recommendations.referred_shortlist = $1
    )
