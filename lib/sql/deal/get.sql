SELECT deals.*,
  'deal' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  (
    SELECT ARRAY_AGG(id ORDER BY created_at ASC) FROM deals_roles WHERE deal = deals.id AND deleted_at IS NULL
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
      EXTRACT(EPOCH FROM list_date) as list_date,
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
            addresses.street_suffix,
            CASE
              WHEN addresses.unit_number IS NULL THEN NULL
              WHEN addresses.unit_number = '' THEN NULL
              ELSE '#' || addresses.unit_number || ',' END,
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
    WITH c AS (
      SELECT
        *,
        EXTRACT(EPOCH FROM context.created_at) AS created_at,
        EXTRACT(EPOCH FROM context.approved_at) AS approved_at,
        EXTRACT(EPOCH FROM context.date) AS date
      FROM deal_context() context WHERE context.deal = deals.id
    )

    SELECT
      JSON_OBJECT_AGG(c.key, c.*)
    FROM c
  ) as deal_context,

  (
    SELECT ARRAY_AGG(id) FROM envelopes WHERE deal = deals.id
  ) as envelopes,

  CASE WHEN $2::uuid IS NULL THEN
    0
  ELSE
  (
    SELECT COUNT(*)::INT FROM get_new_notifications(
      (
        SELECT ARRAY_AGG(room) FROM tasks WHERE checklist IN (SELECT id FROM deals_checklists WHERE deal = deals.id)
      ), $2
    )
  )
  END AS new_notifications,

  (
    SELECT
      ARRAY_AGG(DISTINCT brands_checklists.tab_name)
    FROM tasks
    JOIN deals_checklists  ON tasks.checklist = deals_checklists.id
    JOIN brands_checklists ON deals_checklists.origin = brands_checklists.id
    WHERE
      deals_checklists.deal = deals.id
      AND tasks.needs_attention IS TRUE
      AND tasks.deleted_at IS NULL
  ) as inboxes,

  (
    SELECT
      COUNT(*)::INT
    FROM tasks
    JOIN deals_checklists  ON tasks.checklist = deals_checklists.id
    WHERE
      deals_checklists.deal = deals.id
      AND deals_checklists.terminated_at  IS NULL
      AND deals_checklists.deactivated_at IS NULL
      AND tasks.needs_attention IS TRUE
      AND tasks.deleted_at IS NULL
  ) as need_attentions

FROM deals
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON deals.id = did
ORDER BY t.ord
