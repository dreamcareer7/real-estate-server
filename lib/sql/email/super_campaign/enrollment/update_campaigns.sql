UPDATE
  super_campaigns_enrollments AS sce
SET
  updated_at = now(),
  campaign = t.campaign
FROM json_to_recordset($1::json) AS t(
  enrollment uuid,
  campaign uuid
)
WHERE
  sce.id = t.enrollment
