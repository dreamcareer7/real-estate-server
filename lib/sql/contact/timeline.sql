WITH list_contacts AS (
  SELECT email_campaigns_recipients.campaign
  FROM   email_campaigns_recipients
  JOIN   crm_lists_members
    ON   email_campaigns_recipients.list = crm_lists_members.list
  WHERE  crm_lists_members.contact = $1::uuid
),
tag_contacts AS (
  SELECT email_campaigns_recipients.campaign
  FROM   email_campaigns_recipients
  JOIN   contacts_summaries
    ON   ARRAY[email_campaigns_recipients.tag] <@ contacts_summaries.tag
  WHERE  contacts_summaries.id = $1::uuid
),
auto_emails AS (
  (
    SELECT
      campaign
    FROM
      email_campaigns_recipients
    WHERE
      contact = $1::uuid
  )
  UNION (
    SELECT campaign FROM list_contacts
  )
  UNION (
    SELECT campaign FROM tag_contacts
  )
),
timeline_content AS (
  (
    SELECT crm_tasks.id, due_date as "timestamp", 'crm_task' as "type"
    FROM crm_tasks
    INNER JOIN crm_associations ON crm_tasks.id = crm_associations.crm_task
    WHERE
      contact = $1::uuid
      AND crm_tasks.brand = $2::uuid
      AND crm_associations.deleted_at IS NULL
      AND crm_tasks.deleted_at IS NULL
  )
  UNION ALL
  (
    SELECT
      id,
      created_at as "timestamp",
      'contact_attribute' AS "type"
    FROM
      contacts_attributes
    WHERE
      deleted_at IS NULL
      AND contact = $1::uuid
      AND attribute_type = 'note'
  )
  UNION ALL
  (
    SELECT
      id,
      due_at AS "timestamp",
      'email_campaign'
    FROM
      email_campaigns
      JOIN auto_emails
        ON auto_emails.campaign = email_campaigns.id
    WHERE
      due_at IS NOT NULL
      AND executed_at IS NULL
      AND deleted_at IS NULL
  )
),
with_total AS (
  SELECT *, (count(*) over())::int AS total
  FROM timeline_content
)
SELECT
  id, "timestamp", "type", total
FROM
  with_total
WHERE CASE
  WHEN $3::float IS NOT NULL THEN
    with_total."timestamp" <= to_timestamp($3)
  ELSE
    True
END
ORDER BY with_total."timestamp" DESC
LIMIT $4
