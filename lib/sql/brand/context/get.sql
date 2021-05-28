SELECT brands_contexts.*,
  'brand_context' AS type
FROM brands_contexts
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_contexts.id = bid
ORDER BY t.ord
