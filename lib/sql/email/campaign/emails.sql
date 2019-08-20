WITH
list_contacts AS (
  SELECT contacts.email[1], contacts.id, email_campaigns_recipients.send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id              =  email_campaigns_recipients.campaign
  JOIN   crm_lists_members          ON email_campaigns_recipients.list = crm_lists_members.list
  JOIN   contacts                   ON crm_lists_members.contact       = contacts.id
         AND email_campaigns.brand = contacts.brand

  WHERE email_campaigns_recipients.recipient_type = 'List'
        AND email_campaigns.id = $1
        AND contacts.deleted_at IS NULL
        AND ARRAY_LENGTH(contacts.email, 1) > 0
),

tag_contacts AS (
  SELECT contacts.email[1], contacts.id, email_campaigns_recipients.send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id =  email_campaigns_recipients.campaign
  JOIN   contacts         ON ARRAY[email_campaigns_recipients.tag] <@ contacts.tag
         AND email_campaigns.brand = contacts.brand

  WHERE email_campaigns_recipients.recipient_type = 'Tag'
        AND email_campaigns.id = $1
        AND contacts.deleted_at IS NULL
        AND ARRAY_LENGTH(contacts.email, 1) > 0
),

contact_recipients AS (
  SELECT COALESCE(email_campaigns_recipients.email, contacts.email[1]), contacts.id, email_campaigns_recipients.send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id = email_campaigns_recipients.campaign
  JOIN   contacts         ON email_campaigns_recipients.contact = contacts.id
         AND email_campaigns.brand = contacts.brand

  WHERE email_campaigns_recipients.recipient_type = 'Email'
        AND email_campaigns.id = $1
        AND contacts.deleted_at IS NULL
        AND ARRAY_LENGTH(contacts.email, 1) > 0
),

all_contacts_recipients AS (
  SELECT contacts.email[1], contacts.id, email_campaigns_recipients.send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id    = email_campaigns_recipients.campaign
  JOIN   contacts                   ON email_campaigns.brand = contacts.brand

  WHERE email_campaigns_recipients.recipient_type = 'AllContacts'
        AND email_campaigns.id = $1
        AND contacts.deleted_at IS NULL
        AND ARRAY_LENGTH(contacts.email, 1) > 0
),

brand_recipients AS (
  SELECT             users.email, contacts_users.contact, email_campaigns_recipients.send_type
  FROM               email_campaigns_recipients
  CROSS JOIN LATERAL get_brand_agents(email_campaigns_recipients.brand) ba
  JOIN               users          ON users.id = ba.user
  LEFT JOIN          contacts_users ON contacts_users.user = users.id
  WHERE              email_campaigns_recipients.campaign = $1
  AND                email_campaigns_recipients.brand IS NOT NULL
  AND                email_campaigns_recipients.recipient_type = 'Brand'
),


all_emails AS (
  SELECT email, contact, send_type FROM email_campaigns_recipients
  WHERE email_campaigns_recipients.campaign = $1 AND email IS NOT NULL AND contact IS NULL
  UNION
  SELECT * FROM contact_recipients
  UNION
  SELECT * FROM list_contacts
  UNION
  SELECT * FROM tag_contacts
  UNION
  SELECT * FROM all_contacts_recipients
  UNION
  SELECT * FROM brand_recipients
)

SELECT DISTINCT ON(email) * FROM all_emails
WHERE email IS NOT NULL;
