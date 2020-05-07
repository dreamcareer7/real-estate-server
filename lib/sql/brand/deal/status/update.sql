UPDATE brands_deal_statuses SET
  label = $2,
  deal_types = $3,
  property_types = $4,
  color = $5,
  admin_only = $6,
  is_archived = $7,
  is_active = $8,
  is_pending = $9,
WHERE id = $1
