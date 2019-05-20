WITH list_contacts AS (
  SELECT contacts_summaries.email[1], contacts_summaries.id, email_campaigns_recipients.recipient_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id              = email_campaigns_recipients.campaign
  JOIN   crm_lists_members          ON email_campaigns_recipients.list = crm_lists_members.list
  JOIN   contacts_summaries         ON crm_lists_members.contact       = contacts_summaries.id
  WHERE email_campaigns.id = $1
),

tag_contacts AS (
  SELECT contacts_summaries.email[1], contacts_summaries.id, email_campaigns_recipients.recipient_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id                    =  email_campaigns_recipients.campaign
  JOIN   contacts_summaries         ON ARRAY[email_campaigns_recipients.tag] <@ contacts_summaries.tag
         AND email_campaigns.brand = contacts_summaries.brand
  WHERE email_campaigns.id = $1
)

SELECT email, contact, recipient_type FROM email_campaigns_recipients
WHERE email_campaigns_recipients.campaign = $1 AND email IS NOT NULL
UNION
SELECT * FROM list_contacts
UNION
SELECT * FROM tag_contacts
