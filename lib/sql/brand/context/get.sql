SELECT brands_contexts.*,
  'brand_context' AS type,
  required::text[] as required,
  optional::text[] as optional
FROM brands_contexts
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_contexts.id = bid
ORDER BY t.ord
