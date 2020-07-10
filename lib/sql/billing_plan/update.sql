UPDATE billing_plans SET
  acl = $2,
  chargebee_id = $3,
  chargebee_object = $4
WHERE id = $1
