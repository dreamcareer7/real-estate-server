WITH brand_users AS (
  SELECT id as "user" FROM users
  WHERE agent IN(
    SELECT get_brand_agents($3)
  )
)

,sorted_brand_users AS (
  SELECT
    brand_users.user as "user",
    (
      CASE WHEN $2::uuid IS NULL THEN 0
           WHEN brand_users.user = (SELECT agent FROM users WHERE id = $2::uuid) THEN 1
           ELSE 0
      END
    ) as is_me,
    (
      CASE WHEN $2::uuid::uuid IS NULL THEN 0 ELSE
      (
        SELECT
        (
          (
            SELECT COUNT(*)
            FROM contacts
            INNER JOIN contacts_emails
            ON contacts.id = contacts_emails.contact
            WHERE contacts."user" = $2::uuid AND
                  LOWER(contacts_emails.email) = (SELECT lower(email) FROM users WHERE id = $2::uuid LIMIT 1)
          ) +
          (
            SELECT COUNT(*)
            FROM contacts
            INNER JOIN contacts_phone_numbers
            ON contacts.id = contacts_phone_numbers.contact
            WHERE contacts."user" = $2::uuid AND
                  contacts_phone_numbers.phone_number = (SELECT phone_number FROM users WHERE id = $2::uuid LIMIT 1)
          )
        )
      ) END
    ) as has_contact
    FROM brand_users
  ORDER BY is_me DESC, has_contact DESC, RANDOM()
  LIMIT 1
)

,listing AS (
  SELECT 'listing' AS TYPE,
        listings.*,
        (
          SELECT "user" FROM sorted_brand_users LIMIT 1
        ) as proposed_agent,
        EXTRACT(EPOCH FROM listings.created_at) AS created_at,
        EXTRACT(EPOCH FROM listings.updated_at) AS updated_at,
        EXTRACT(EPOCH FROM listings.deleted_at) AS deleted_at,
        EXTRACT(EPOCH FROM listings.list_date) AS list_date,
        EXTRACT(EPOCH FROM listings.close_date) AS close_date,
        (
          SELECT id FROM agents WHERE matrix_unique_id = listings.list_agent_mui LIMIT 1
        ) as list_agent,
        (
          CASE WHEN $2::uuid IS NULL THEN FALSE ELSE (
             SELECT count(*) > 0 FROM recommendations
             LEFT JOIN recommendations_eav ON recommendations.id = recommendations_eav.recommendation
             WHERE recommendations.listing = listings.id
             AND recommendations_eav.user = $2
             AND recommendations_eav.action = 'Favorited'
          ) END
        ) as favorited,
        (
          SELECT COALESCE(ARRAY_AGG(url ORDER BY "order"), '{}'::text[]) FROM photos
          WHERE
          listing_mui = listings.matrix_unique_id
          AND photos.url IS NOT NULL
          AND photos.deleted_at IS NULL
        ) as gallery_image_urls,
        (
          SELECT url FROM photos
          WHERE
          listing_mui = listings.matrix_unique_id
          AND photos.url IS NOT NULL
          AND photos.deleted_at IS NULL
          ORDER BY "order" LIMIT 1
        ) as cover_image_url,
        (
          SELECT json_agg(a) FROM (
            SELECT
              id,
              type as open_house_type,
              'open_house' as type,
              EXTRACT(EPOCH FROM created_at) AS created_at,
              EXTRACT(EPOCH FROM updated_at) AS updated_at,
              EXTRACT(EPOCH FROM start_time) AS start_time,
              EXTRACT(EPOCH FROM end_time) AS end_time,
              description
            FROM open_houses WHERE
            start_time > NOW() AND
            listing_mui = listings.matrix_unique_id
          ) AS a
        ) AS open_houses
  FROM listings
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(lid, ord) ON listings.id = lid
  ORDER BY t.ord
),
property AS (
  SELECT 'property' AS TYPE,
        properties.*,
        EXTRACT(EPOCH FROM properties.created_at) AS created_at,
        EXTRACT(EPOCH FROM properties.updated_at) AS updated_at
  FROM properties
  JOIN listing ON properties.matrix_unique_id = listing.matrix_unique_id
),
address AS (
  SELECT addresses.*,
       'address' AS TYPE,
       (
        CASE WHEN location IS NULL THEN NULL ELSE
          json_build_object('type', 'location', 'longitude', ST_X(location), 'latitude', ST_Y(location))
        END
       ) as location,
       EXTRACT(EPOCH FROM addresses.created_at) AS created_at,
       EXTRACT(EPOCH FROM addresses.updated_at) AS updated_at
  FROM addresses
  JOIN listing ON listing.matrix_unique_id = addresses.matrix_unique_id
),
property_object AS (
  SELECT property.*, row_to_json(address) as address FROM property
  JOIN address ON property.matrix_unique_id = address.matrix_unique_id
)

SELECT listing.*, row_to_json(property_object) as property FROM listing
JOIN property_object ON listing.property_id = property_object.id
