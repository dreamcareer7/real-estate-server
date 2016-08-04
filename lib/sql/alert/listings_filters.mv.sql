CREATE MATERIALIZED VIEW listings_filters AS SELECT
  listings.id AS id,
  listings.status AS status,
  listings.price AS price,
  listings.matrix_unique_id AS matrix_unique_id,
  listings.close_date AS close_date,
  listings.list_office_mls_id,
  listings.list_agent_mls_id,
  listings.close_price AS close_price,
  listings.created_at AS created_at,
  -- Areas are stored as something like this: MCKINNEY AREA (53)
  -- When filteting, we only want the number (53). So we extract it.
  (regexp_matches(listings.mls_area_major, E'[0-9]+'))[1]::int as mls_area_major,
  (regexp_matches(listings.mls_area_minor, E'[0-9]+'))[1]::int as mls_area_minor,
  properties.square_meters,
  properties.bedroom_count,
  properties.half_bathroom_count,
  properties.full_bathroom_count,
  properties.property_type,
  properties.property_subtype,
  properties.year_built,
  properties.pool_yn,
  properties.lot_square_meters,
  properties.number_of_parking_spaces,
  properties.architectural_style,
  properties.subdivision_name,
  properties.school_district,
  properties.elementary_school_name,
  properties.intermediate_school_name,
  properties.junior_high_school_name,
  properties.middle_school_name,
  properties.primary_school_name,
  properties.senior_high_school_name,
  addresses.location,
  addresses.county_or_parish,
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

CREATE UNIQUE INDEX listings_filters_id ON listings_filters(id);
CREATE INDEX listings_filters_location ON listings_filters USING GIST (location);
CREATE INDEX listings_filters_mls_area_major ON listings_filters(mls_area_major);
CREATE INDEX listings_filters_mls_area_minor ON listings_filters(mls_area_minor);
CREATE INDEX listings_filters_status         ON listings_filters(status);
CREATE INDEX listings_filters_address_trgm   ON listings_filters USING gin (address gin_trgm_ops);
CREATE INDEX listings_filters_status_order   ON listings_filters(order_listings(status));
CREATE INDEX listings_filters_list_office    ON listings_filters(list_office_mls_id);
CREATE INDEX listings_filters_list_agent     ON listings_filters(list_agent_mls_id);
CREATE INDEX listings_filters_address        ON listings_filters USING GIN (to_tsvector('english', address));
CREATE INDEX listings_filters_price          ON listings_filters(price);
CREATE INDEX listings_filters_close_price    ON listings_filters(close_price);