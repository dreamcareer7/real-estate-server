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

checklists AS (
  INSERT INTO brands_contexts_checklists
  (context, checklist, is_required)
  SELECT
    (SELECT id FROM context),
    checklist,
    COALESCE(is_required,  FALSE)
  FROM json_populate_recordset(NULL::brands_contexts_checklists, $14::json)
)

SELECT * FROM context
