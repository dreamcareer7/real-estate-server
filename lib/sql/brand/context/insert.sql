WITH context AS (
  INSERT INTO brands_contexts (
    brand,
    key,
    label,
    short_label,
    "order",
    section,
    needs_approval,
    exports,
    preffered_source,
    default_value,
    data_type,
    format,
    triggers_brokerwolf
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  RETURNING *
),

property_types AS (
  INSERT INTO brands_contexts_property_types
  (brand, context, property_type, is_required, when_offer, when_buying, when_selling)
  SELECT
    (SELECT brand FROM context),
    (SELECT id FROM context),
    property_type,
    COALESCE(is_required,  FALSE),
    COALESCE(when_offer,   FALSE),
    COALESCE(when_buying,  FALSE),
    COALESCE(when_selling, FALSE)
  FROM json_populate_recordset(NULL::brands_contexts_property_types, $14::json)
)

SELECT * FROM context
