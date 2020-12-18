WITH to_delete AS (
  DELETE FROM brands_contexts_property_types
  WHERE context = $1
),

updated AS (
  UPDATE brands_contexts SET
    key = $2,
    label = $3,
    short_label = $4,
    "order" = $5,
    section = $6,
    needs_approval = $7,
    exports = $8,
    preffered_source = $9,
    default_value = $10,
    data_type = $11,
    format = $12,
    triggers_brokerwolf = $13
  WHERE id = $1
  RETURNING *
)

INSERT INTO brands_contexts_property_types
  (brand, context, property_type, is_required, when_offer, when_buying, when_selling)
  SELECT
    (SELECT brand FROM updated),
    (SELECT id FROM updated),
    property_type,
    COALESCE(is_required,  FALSE),
    COALESCE(when_offer,   FALSE),
    COALESCE(when_buying,  FALSE),
    COALESCE(when_selling, FALSE)
  FROM json_populate_recordset(NULL::brands_contexts_property_types, $14::json)
  RETURNING id
