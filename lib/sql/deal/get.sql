SELECT deals.*,
  'deal' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  (
    SELECT ARRAY_AGG(id) FROM deals_roles WHERE deal = deals.id
  ) AS roles,
  (
    SELECT ARRAY_AGG(id ORDER BY "order") FROM deals_checklists WHERE deal = deals.id
  ) as checklists,

  (
    WITH checklists AS (
      SELECT id FROM deals_checklists WHERE deal = deals.id AND deactivated_at IS NULL
    ),

    submissions AS (
      SELECT submission FROM tasks WHERE checklist IN ( SELECT id FROM checklists )
    ),

    revisions AS (
      SELECT
        DISTINCT ON(id) id
      FROM
        forms_data
      WHERE
        submission IN (SELECT submission FROM submissions)
      ORDER BY id, created_at DESC
    )

    SELECT
      JSON_OBJECT_AGG(forms_data_context.key, forms_data_context)
    FROM
      forms_data_context
    WHERE
      revision IN(SELECT id FROM revisions)
  ) as form_context,

  (
    SELECT ROW_TO_JSON(p.*) FROM
    (
      SELECT
      'deal_proposed_values' AS type,
      status AS listing_status,
      transaction_type,
      mls_number,
      mls_area_major,
      mls_area_minor,
      price AS list_price,
      list_date,
      property_type,
      year_built,
      city,
      county_or_parish AS county,
      postal_code,
      street_number,
      street_dir_prefix,
      street_name,
      street_suffix,
      postal_code,
      lot_number,
      subdivision_name AS subdivision,
      unit_number,
      state_code,
      state,
      (
        SELECT ARRAY_TO_STRING
        (
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
      ) AS full_address,
      (
        SELECT ARRAY_TO_STRING(
          ARRAY[
          addresses.street_number,
          addresses.street_dir_prefix,
          addresses.street_name,
          addresses.street_suffix
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
      FROM listings
      JOIN properties ON listings.property_id = properties.id
      JOIN addresses ON properties.address_id = addresses.id
      WHERE listings.id = deals.listing
    ) p
  ) AS mls_context,

  (
    SELECT
      JSON_OBJECT_AGG(deal_context.key, deal_context.*)
    FROM
      deal_context
    WHERE
      deal = deals.id
  ) AS deal_context
FROM deals
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals.id = did
ORDER BY t.ord
