UPDATE brands_deal_statuses SET
  label = $2,
  deal_types = $3,
  property_types = $4,
  admin_only = $5,
  is_archived = $6,
  is_active = $7,
  is_pending = $8
WHERE id = $1
