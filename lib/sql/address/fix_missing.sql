WITH
G_ROOFTOP AS
(
  UPDATE addresses
  SET location = location_google,
      geocoded = TRUE,
      approximate = FALSE,
      corrupted = FALSE,
      geo_source = 'Google'
  WHERE location_google IS NOT NULL AND
        geocoded_google IS TRUE AND
        geo_confidence_google = 'ROOFTOP' AND
        location IS NULL AND
        geocoded IS FALSE
  RETURNING id
),
B_HIGH AS
(
  UPDATE addresses
  SET location = location_bing,
      geocoded = TRUE,
      approximate = FALSE,
      corrupted = FALSE,
      geo_source = 'Bing'
  WHERE location_bing IS NOT NULL AND
        geocoded_bing IS TRUE AND
        geo_confidence_bing = 'High' AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP
        )
  RETURNING id
),
G_RANGE AS
(
  UPDATE addresses
  SET location = location_google,
      geocoded = TRUE,
      approximate = FALSE,
      corrupted = FALSE,
      geo_source = 'Google'
  WHERE location_google IS NOT NULL AND
        geocoded_google IS TRUE AND
        geo_confidence_google = 'RANGE_INTERPOLATED' AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP UNION
          SELECT id FROM B_HIGH
        )
  RETURNING id
),
G_GEOMETRIC AS
(
  UPDATE addresses
  SET location = location_google,
      geocoded = TRUE,
      approximate = TRUE,
      corrupted = FALSE,
      geo_source = 'Google'
  WHERE location_google IS NOT NULL AND
        geocoded_google IS TRUE AND
        geo_confidence_google = 'GEOMETRIC_CENTER' AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP UNION
          SELECT id FROM B_HIGH UNION
          SELECT id FROM G_RANGE
        )
  RETURNING id
),
B_STPSTL AS
(
  UPDATE addresses
  SET location = location_bing,
      geocoded = TRUE,
      approximate = TRUE,
      corrupted = FALSE,
      geo_source = 'Bing'
  WHERE location_bing IS NOT NULL AND
        geocoded_bing IS TRUE AND
        (
          STRPOS(LOWER(geo_source_formatted_address_bing), LOWER(postal_code)) > 0 AND
          STRPOS(LOWER(geo_source_formatted_address_bing), LOWER(street_name)) > 0
        ) AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP UNION
          SELECT id FROM B_HIGH UNION
          SELECT id FROM G_RANGE UNION
          SELECT id FROM G_GEOMETRIC
        )
  RETURNING id
),
G_STPSTL AS
(
  UPDATE addresses
  SET location = location_google,
      geocoded = TRUE,
      approximate = TRUE,
      corrupted = FALSE,
      geo_source = 'Google'
  WHERE location_google IS NOT NULL AND
        geocoded_google IS TRUE AND
        (
          STRPOS(LOWER(geo_source_formatted_address_google), LOWER(postal_code)) > 0 AND
          STRPOS(LOWER(geo_source_formatted_address_google), LOWER(street_name)) > 0
        ) AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP UNION
          SELECT id FROM B_HIGH UNION
          SELECT id FROM G_RANGE UNION
          SELECT id FROM G_GEOMETRIC UNION
          SELECT id FROM B_STPSTL
        )
  RETURNING id
),
B_PSTL AS
(
  UPDATE addresses
  SET location = location_bing,
      geocoded = TRUE,
      approximate = TRUE,
      corrupted = FALSE,
      geo_source = 'Bing'
  WHERE location_bing IS NOT NULL AND
        geocoded_bing IS TRUE AND
        (
          STRPOS(LOWER(geo_source_formatted_address_bing), LOWER(postal_code)) > 0
        ) AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP UNION
          SELECT id FROM B_HIGH UNION
          SELECT id FROM G_RANGE UNION
          SELECT id FROM G_GEOMETRIC UNION
          SELECT id FROM B_STPSTL UNION
          SELECT id FROM G_STPSTL
        )
  RETURNING id
),
G_PSTL AS
(
  UPDATE addresses
  SET location = location_google,
      geocoded = TRUE,
      approximate = TRUE,
      corrupted = FALSE,
      geo_source = 'Google'
  WHERE location_google IS NOT NULL AND
        geocoded_google IS TRUE AND
        (
          STRPOS(LOWER(geo_source_formatted_address_google), LOWER(postal_code)) > 0
        ) AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP UNION
          SELECT id FROM B_HIGH UNION
          SELECT id FROM G_RANGE UNION
          SELECT id FROM G_GEOMETRIC UNION
          SELECT id FROM B_STPSTL UNION
          SELECT id FROM G_STPSTL UNION
          SELECT id FROM B_PSTL
        )
  RETURNING id
),
B_ALL AS
(
  UPDATE addresses
  SET location = location_bing,
      geocoded = TRUE,
      approximate = TRUE,
      corrupted = FALSE,
      geo_source = 'Bing'
  WHERE location_bing IS NOT NULL AND
        geocoded_bing IS TRUE AND
        location IS NULL AND
        geocoded IS FALSE AND
        id NOT IN
        (
          SELECT id FROM G_ROOFTOP UNION
          SELECT id FROM B_HIGH UNION
          SELECT id FROM G_RANGE UNION
          SELECT id FROM G_GEOMETRIC UNION
          SELECT id FROM B_STPSTL UNION
          SELECT id FROM G_STPSTL UNION
          SELECT id FROM B_PSTL UNION
          SELECT id FROM G_PSTL
        )
  RETURNING id
)
SELECT id FROM G_ROOFTOP UNION
SELECT id FROM B_HIGH UNION
SELECT id FROM G_RANGE UNION
SELECT id FROM G_GEOMETRIC UNION
SELECT id FROM B_STPSTL UNION
SELECT id FROM G_STPSTL UNION
SELECT id FROM B_PSTL UNION
SELECT id FROM G_PSTL UNION
SELECT id FROM B_ALL
