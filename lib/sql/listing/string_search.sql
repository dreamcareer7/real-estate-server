SELECT listings.id
FROM listings
INNER JOIN addresses ON
    listings.matrix_unique_id = addresses.matrix_unique_id
WHERE
    (
     CASE WHEN ARRAY_LENGTH($1::text[], 1) IS NOT NULL THEN
     (
      (
       addresses.title || ' ' ||
       addresses.subtitle || ' ' ||
       addresses.street_number || ' ' ||
       addresses.street_name || ' ' ||
       addresses.city || ' ' ||
       addresses.state || ' ' ||
       addresses.state_code || ' ' ||
       addresses.street_suffix || ' ' ||
       addresses.country::text || ' ' ||
       addresses.country_code::text || ' ' ||
       addresses.street_dir_prefix || ' ' ||
       addresses.street_dir_suffix || ' ' ||
       listings.mls_number
      ) ~* ALL($1)
     ) ELSE TRUE END
    )
    AND (
      CASE
        WHEN $2::listing_status[] IS NULL THEN TRUE
        ELSE listings.status = ANY($2::listing_status[])
      END
    )
LIMIT 10
