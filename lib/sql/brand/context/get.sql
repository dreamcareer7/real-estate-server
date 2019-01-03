SELECT brands_contexts.*,
  'brand_context' AS type,
  required::text[] as required,
  optional::text[] as optional,

  (
    CASE
        WHEN data_type = 'Text'   THEN default_value::text
        WHEN data_type = 'Number' THEN default_value::float
        WHEN data_type = 'Date'   THEN default_value::timestamp with time zone
    END
  ) as default_value

FROM brands_contexts
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_contexts.id = bid
ORDER BY t.ord
