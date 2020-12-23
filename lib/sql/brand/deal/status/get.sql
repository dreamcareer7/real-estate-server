SELECT brands_deal_statuses.*,
  -- This is a temporary fix. We released this and it turns out iOS app calls it
  -- "admin_required" rather than "admin_only". So in order to temporarily resolve
  -- the issue, I'm also giving it the "admin_required" field for a few days until
  -- all users have the new one. This columns basically needs to be
  -- removed in May 30 2020 or later.
  admin_only as admin_required,
  'brand_deal_status' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_deal_statuses
JOIN unnest($1::uuid[]) WITH ORDINALITY t(sid, ord) ON brands_deal_statuses.id = sid
ORDER BY t.ord
