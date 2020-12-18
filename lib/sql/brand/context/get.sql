SELECT brands_contexts.*,
  'brand_context' AS type,

  (
    CASE
      WHEN $2 && ARRAY['brand_context.property_types'] THEN
        (
          SELECT JSON_AGG(bcpt)
          FROM brands_contexts_property_types bcpt
          WHERE bcpt.context = brands_contexts.id
        )
      ELSE NULL
    END
  ) as property_types
FROM brands_contexts
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_contexts.id = bid
ORDER BY t.ord
