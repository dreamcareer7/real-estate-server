SELECT
  id,
  check_crm_activity_read_access(crm_activities, $2) AS "read",
  check_crm_activity_write_access(crm_activities, $2) AS "write"
FROM
  crm_activities
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON crm_activities.id = did
