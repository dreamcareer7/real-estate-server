WITH to_insert AS (
  SELECT
    tags,
    brand
  FROM
    json_populate_recordset(NULL::super_campaigns_recipients, $2::json)
),

clear AS (
  DELETE FROM super_campaigns_recipients WHERE super_campaign IN (
    SELECT super_campaign FROM to_insert
  )
)

INSERT INTO super_campaigns_recipients (
  super_campaign,
  tags,
  brand
)

SELECT
  $1::uuid,
  tags,
  brand
FROM
  to_insert
