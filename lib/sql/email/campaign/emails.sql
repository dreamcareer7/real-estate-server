WITH list_contacts AS (
  SELECT contacts.email[1], contacts.id, email_campaigns_recipients.recipient_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id              = email_campaigns_recipients.campaign
  JOIN   crm_lists_members          ON email_campaigns_recipients.list = crm_lists_members.list
  JOIN   contacts         ON crm_lists_members.contact       = contacts.id
         AND email_campaigns.brand = contacts.brand
  WHERE email_campaigns.id = $1 AND contacts.deleted_at IS NULL
),

tag_contacts AS (
  SELECT contacts.email[1], contacts.id, email_campaigns_recipients.recipient_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id                    =  email_campaigns_recipients.campaign
  JOIN   contacts         ON ARRAY[email_campaigns_recipients.tag] <@ contacts.tag
         AND email_campaigns.brand = contacts.brand
  WHERE email_campaigns.id = $1 AND contacts.deleted_at IS NULL
),

contact_recipients AS (
  SELECT COALESCE(email_campaigns_recipients.email, contacts.email[1]), contacts.id, email_campaigns_recipients.recipient_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id                 =  email_campaigns_recipients.campaign
  JOIN   contacts         ON email_campaigns_recipients.contact = contacts.id
         AND email_campaigns.brand = contacts.brand
  WHERE email_campaigns.id = $1 AND contacts.deleted_at IS NULL
),

all_emails AS (
  SELECT email, contact, recipient_type FROM email_campaigns_recipients
  WHERE email_campaigns_recipients.campaign = $1 AND email IS NOT NULL AND contact IS NULL
  UNION
  SELECT * FROM contact_recipients
  UNION
  SELECT * FROM list_contacts
  UNION
  SELECT * FROM tag_contacts
)

SELECT DISTINCT ON(email) * FROM all_emails
WHERE email IS NOT NULL;
