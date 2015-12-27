SELECT
  listings.mls_number,
  properties.square_meters,
  properties.bedroom_count,
  properties.half_bathroom_count + properties.full_bathroom_count as bathroom_count,
  properties.property_type,
  properties.property_subtype,
  properties.year_built,
  properties.pool_yn,
  properties.lot_square_meters,
  ST_X(addresses.location) as longitude, ST_Y(addresses.location) as latitude
FROM listings
  JOIN properties on listings.property_id = properties.id
  JOIN addresses on properties.address_id = addresses.id
  WHERE listings.mls_number = $1