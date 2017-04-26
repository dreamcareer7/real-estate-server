WITH data AS (
  SELECT
    'deal_proposed_values' as type,
    status as listing_status,
    transaction_type,
    mls_number,
    mls_area_major,
    mls_area_minor,
    price as list_price,
    list_date,
    property_type,
    year_built,
    city,
    county_or_parish as county,
    postal_code,
    street_number,
    street_dir_prefix,
    street_name,
    street_suffix,
    postal_code,
    lot_number,
    subdivision_name as subdivision,
    unit_number,
    state_code,
    state,
    (
      SELECT ARRAY_TO_STRING(
        ARRAY[
          addresses.street_number,
          addresses.street_dir_prefix,
          addresses.street_name,
          addresses.street_suffix || ',',
          addresses.city || ',',
          addresses.state_code,
          addresses.postal_code
        ], ' ', NULL
      )
    ) as full_address,
    (
      SELECT ARRAY_TO_STRING(
        ARRAY[
          addresses.street_number,
          addresses.street_dir_prefix,
          addresses.street_name,
          addresses.street_suffix || ','
        ], ' ', NULL
      )
    ) as street_address,
    (
      SELECT url FROM photos
      WHERE
      listing_mui = listings.matrix_unique_id
      AND photos.url IS NOT NULL
      AND photos.deleted_at IS NULL
      ORDER BY "order" LIMIT 1
    ) as photo
  FROM listings
  JOIN properties ON listings.property_id = properties.id
  JOIN addresses ON properties.address_id = addresses.id
  WHERE listings.id = (SELECT listing FROM deals WHERE id = $1)
)

SELECT *,
  'deal' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,

  (
    SELECT ARRAY_AGG(id) FROM deals_roles WHERE deal = $1
  ) AS roles,

  (
    SELECT ARRAY_AGG(file) FROM files_relations WHERE role = 'Deal' AND role_id = $1 AND deleted_at IS NULL
  ) AS files,

  (
    SELECT ROW_TO_JSON(data) FROM data LIMIT 1
  ) as proposed_values,

  (
    SELECT ARRAY_AGG(id) FROM reviews WHERE deal = $1
  ) as reviews

FROM deals WHERE id = $1
