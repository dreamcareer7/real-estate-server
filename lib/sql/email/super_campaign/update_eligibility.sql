WITH d AS (
  DELETE FROM super_campaigns_eligibility WHERE super_campaign = $1::uuid AND brand = ANY($2::uuid[])
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
  unnest($3::uuid[]) eligibility(brand)
