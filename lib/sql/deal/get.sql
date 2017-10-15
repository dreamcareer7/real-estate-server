SELECT deals.*,
  'deal' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  (
    SELECT ARRAY_AGG(id) FROM deals_roles WHERE deal = deals.id AND deleted_at IS NULL
  ) AS roles,
  (
    SELECT ARRAY_AGG(id ORDER BY "order") FROM deals_checklists WHERE deal = deals.id
  ) as checklists,

  (
    SELECT ROW_TO_JSON(p.*) FROM
    (
      SELECT
      'mls_context' AS type,
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
    WITH context AS (
      SELECT
        deal_context.id,
        'deal_context_item' as type,
        deal_context.created_at,
        deal_context.created_by,
        deal_context.approved,
        deal_context.key,
        deal_context.value,
        deal_context.text,
        deal_context.number,
        deal_context.date,
        deal_context.context_type
      FROM
        deal_context
      LEFT JOIN forms_data ON deal_context.revision = forms_data.id
      LEFT JOIN forms_submissions ON forms_data.submission = forms_submissions.id
      LEFT JOIN tasks ON forms_submissions.id = tasks.submission
      LEFT JOIN deals_checklists ON tasks.checklist = deals_checklists.id
      WHERE
        deal_context.deal = deals.id
        AND
        (
          deal_context.revision IS NULL
          OR
          (
            deals_checklists.deactivated_at IS NULL
              AND
            deals_checklists.terminated_at IS NULL
          )
        )
    )

    SELECT
      JSON_OBJECT_AGG(context.key, context.*)
    FROM context
  ) as deal_context,

  (
    SELECT ARRAY_AGG(id) FROM envelopes WHERE deal = deals.id
  ) as envelopes

FROM deals
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals.id = did
ORDER BY t.ord
