WITH to_delete AS (
  UPDATE
    super_campaigns_enrollments
  SET
    deleted_at = now()
  WHERE
    super_campaign = $1::uuid
    AND brand = ANY($2::uuid[])
    -- AND is_pinned IS FALSE
    AND deleted_at IS NULL
)
INSERT INTO super_campaigns_enrollments (
  super_campaign,
  brand,
  "user",
  tags
)
SELECT
  c.id AS super_campaign,
  t.brand,
  t.user,
  array_agg(t.tag)
FROM
  super_campaigns AS c
  CROSS JOIN unnest($3::uuid[]) AS e(brand)
  CROSS JOIN LATERAL brand_valid_children(e.brand) AS bc(brand)
  JOIN brands_roles AS br
    ON bc.brand = br.brand
  JOIN brands_users AS bu
    ON br.id = bu."role"
  JOIN super_campaigns_allowed_tags AS t
    ON t.brand = bc.brand AND t.user = bu.user
WHERE
  c.id = $1::uuid
  AND br.deleted_at IS NULL
  AND bu.deleted_at IS NULL
  AND t.tag = ANY(c.tags)
GROUP BY
  c.id,
  t.brand,
  t.user
ON CONFLICT (super_campaign, brand, "user") DO UPDATE SET
  tags = excluded.tags::text[],
  deleted_at = NULL,
  detached = FALSE
