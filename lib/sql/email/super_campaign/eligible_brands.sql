SELECT
  brand
FROM
  super_campaigns_eligibility
WHERE
  super_campaign = $1::uuid
