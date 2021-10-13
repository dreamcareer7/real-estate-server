WITH d AS (
  DELETE FROM super_campaigns_eligibility WHERE super_campaign = $1::uuid
)
INSERT INTO
  super_campaigns_eligibility (
    super_campaign,
    brand
  )
SELECT
  $1::uuid,
  brand
FROM
  unnest($2::uuid[]) eligibility(brand)
