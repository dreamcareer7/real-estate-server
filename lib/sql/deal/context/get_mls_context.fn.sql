CREATE OR REPLACE FUNCTION get_mls_context(id uuid) RETURNS SETOF mls_context AS
$$
DECLARE
  c mls_context;
  r1 RECORD;
BEGIN
  SELECT
    *,
--     listings.id as listing,
    (
      SELECT ARRAY_TO_STRING
      (
        ARRAY[
          addresses.street_number,
          addresses.street_dir_prefix,
          addresses.street_name,
          addresses.street_suffix,
          CASE
            WHEN addresses.unit_number IS NULL THEN NULL
            WHEN addresses.unit_number = '' THEN NULL
            ELSE 'Unit ' || addresses.unit_number || ',' END,
          addresses.city || ',',
          addresses.state_code,
          addresses.postal_code
        ], ' ', NULL
      )
    ) AS full_address,
    (
      SELECT ARRAY_TO_STRING(
        ARRAY[
        addresses.street_number,
        addresses.street_dir_prefix,
        addresses.street_name,
        addresses.street_suffix,
        CASE
          WHEN addresses.unit_number IS NULL THEN NULL
          WHEN addresses.unit_number = '' THEN NULL
          ELSE 'Unit ' || addresses.unit_number
        END
        ], ' ', NULL
      )
    ) AS street_address,
    (
      SELECT url FROM photos
      WHERE
      listing_mui = listings.matrix_unique_id
      AND photos.url IS NOT NULL
      AND photos.deleted_at IS NULL
      ORDER BY "order" LIMIT 1
    ) AS photo
  INTO r1
  FROM listings
  JOIN properties ON listings.property_id = properties.id
  JOIN addresses ON properties.address_id = addresses.id
  WHERE listings.id = $1;

  IF r1.status IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'listing_status' AS key,
      r1.status::text AS text,
      NULL as date
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.mls_area_major IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'mls_area_major' AS key,
      r1.mls_area_major AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.mls_area_minor IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'mls_area_minor' AS key,
      r1.mls_area_minor AS text
      INTO c;

    RETURN NEXT c;
    END IF;

  IF r1.property_type IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'property_type' AS key,
      r1.property_type AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.city IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'city' AS key,
      r1.city AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.county_or_parish IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'county' AS key,
      r1.county_or_parish AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.postal_code IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'postal_code' AS key,
      r1.postal_code AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.street_number IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'street_number' AS key,
      r1.street_number AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.street_dir_prefix IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'street_dir_prefix' AS key,
      r1.street_dir_prefix AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.street_name IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'street_name' AS key,
      r1.street_name AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.street_suffix IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'street_suffix' AS key,
      r1.street_suffix AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.lot_number IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'lot_number' AS key,
      r1.lot_number AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.block IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'block_number' AS key,
      r1.block AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.subdivision_name IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'subdivision' AS key,
      r1.subdivision_name AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.unit_number IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'unit_number' AS key,
      r1.unit_number AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.state_code IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'state_code' AS key,
      r1.state_code AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.state IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'state' AS key,
      r1.state AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.full_address IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'full_address' AS key,
      r1.full_address AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.street_address IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'street_address' AS key,
      r1.street_address AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.photo IS NOT NULL THEN
    SELECT
      'Text' as data_type,
      'photo' AS key,
      r1.photo AS text
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.price IS NOT NULL THEN
    SELECT
      'Number' as data_type,
      'list_price' AS key,
      null AS text,
      r1.price AS number
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.mls_number IS NOT NULL THEN
    SELECT
      'Number' as data_type,
      'mls_number' AS key,
      null AS text,
      r1.mls_number AS number
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.year_built IS NOT NULL THEN
    SELECT
      'Number' as data_type,
      'year_built' AS key,
      null AS text,
      r1.year_built AS number
      INTO c;

    RETURN NEXT c;
  END IF;

  IF r1.list_date IS NOT NULL THEN
    SELECT
      'Date' as data_type,
      'list_date' AS key,
      null AS text,
      null AS number,
      r1.list_date::timestamp with time zone
      INTO c;

    RETURN NEXT c;
  END IF;

END;
$$
LANGUAGE plpgsql;

