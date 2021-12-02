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
INSERT INTO super_campaigns_enrollments as sce (
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
  JOIN users_settings AS us
    ON us.user = bu.user AND us.brand = bc.brand
  JOIN super_campaigns_allowed_tags AS t
    ON t.brand = bc.brand AND t.user = bu.user
WHERE
  c.id = $1::uuid
  AND br.deleted_at IS NULL
  AND bu.deleted_at IS NULL
  AND COALESCE(us.super_campaign_admin_permission, FALSE)
  AND LOWER(t.tag) IN (SELECT LOWER(lt) FROM UNNEST(c.tags) AS lt)
GROUP BY
  c.id,
  t.brand,
  t.user
ON CONFLICT (super_campaign, brand, "user") DO UPDATE SET
  tags = excluded.tags::text[],
  deleted_at = NULL,
  detached = FALSE
WHERE
  (
    SELECT COALESCE(us.super_campaign_admin_permission, FALSE)
    FROM users_settings AS us
    WHERE us.brand = excluded.brand AND us.user = excluded.user
  ) = TRUE
  AND
  (
    sce.deleted_at IS NOT NULL OR
    sce.detached = FALSE
  )
