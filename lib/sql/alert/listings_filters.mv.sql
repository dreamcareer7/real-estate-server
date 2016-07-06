CREATE MATERIALIZED VIEW listings_filters AS SELECT
  listings.id as id,
  listings.status as status,
  listings.price as price,
  listings.matrix_unique_id as matrix_unique_id,
  listings.close_date as close_date,
  listings.list_office_mls_id,
  listings.list_agent_mls_id,
  properties.square_meters,
  properties.bedroom_count,
  properties.half_bathroom_count,
  properties.full_bathroom_count,
  properties.property_type,
  properties.property_subtype,
  properties.year_built,
  properties.pool_yn,
  properties.lot_square_meters,
  addresses.location,
  (
    addresses.title || ' ' ||
    addresses.subtitle || ' ' ||
    addresses.street_number || ' ' ||
    addresses.street_dir_prefix || ' ' ||
    addresses.street_name || ' ' ||
    addresses.street_suffix || ' ' ||
    addresses.street_dir_suffix || ' ' ||
    addresses.city || ' ' ||
    addresses.state || ' ' ||
    addresses.state_code || ' ' ||
    addresses.postal_code || ' ' ||
    addresses.country::text || ' ' ||
    addresses.country_code::text || ' ' ||
    listings.mls_number
  ) as address
FROM listings
JOIN
  properties ON listings.property_id = properties.id
JOIN
  addresses  ON properties.address_id = addresses.id;

CREATE INDEX listings_filters_status       ON listings_filters(status);
CREATE INDEX listings_filters_address_trgm ON listings_filters USING gin (address gin_trgm_ops);
CREATE INDEX listings_filters_status_order ON listings_filters(order_listings(status));
CREATE INDEX listings_filters_list_office  ON listings_filters(list_office_mls_id);
CREATE INDEX listings_filters_list_agent   ON listings_filters(list_agent_mls_id);
CREATE INDEX listings_filters_address      ON listings_filters USING GIN (to_tsvector('english', address));