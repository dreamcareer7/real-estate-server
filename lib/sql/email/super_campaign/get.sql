WITH
super_campaign_stats AS (
  SELECT
    sc.id,
    count(sce.id)::int AS enrollments_count,
    sum(coalesce(ec.recipients_count, 0))::int AS recipients_count,
    sum(coalesce(ec.delivered, 0))::int AS delivered,
    sum(coalesce(ec.opened, 0))::int AS opened,
    sum(coalesce(ec.clicked, 0))::int AS clicked,
    sum(coalesce(ec.unsubscribed, 0))::int AS unsubscribed
  FROM
    super_campaigns AS sc
  JOIN super_campaigns_enrollments AS sce
    ON sce.super_campaign = sc.id
  LEFT OUTER JOIN email_campaigns AS ec
    ON ec.id = sce.campaign
  WHERE
    sce.deleted_at IS NULL AND
    ec.deleted_at IS NULL
  GROUP BY sc.id
)
SELECT
  sc.id,
  extract(epoch FROM sc.created_at) AS created_at,
  extract(epoch FROM sc.updated_at) AS updated_at,
  extract(epoch FROM sc.deleted_at) AS deleted_at,
  extract(epoch FROM sc.due_at) AS due_at,
  extract(epoch FROM sc.executed_at) AS executed_at,
  sc.created_by,
  sc.brand,
  sc.subject,
  sc.description,
  sc.tags,
  sc.template_instance,

  (
    SELECT array_agg(brand)
    FROM super_campaigns_eligibility
    WHERE super_campaign = sc.id
  ) AS eligible_brands,

  coalesce(stats.enrollments_count, 0) AS enrollments_count,
  coalesce(stats.recipients_count, 0) AS recipients_count,
  coalesce(stats.delivered, 0) AS delivered,
  coalesce(stats.opened, 0) AS opened,
  coalesce(stats.clicked, 0) AS clicked,
  coalesce(stats.unsubscribed, 0) AS unsubscribed,

  'super_campaign' AS type
FROM
  super_campaigns AS sc
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord)
    ON t.eid = sc.id
  LEFT OUTER JOIN super_campaign_stats AS stats
    ON stats.id = sc.id
ORDER BY
  t.ord;
