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
),

all_contacts_recipients AS (
  SELECT contacts.email[1], contacts.id, email_campaigns_recipients.send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id    = email_campaigns_recipients.campaign
  JOIN   contacts                   ON email_campaigns.brand = contacts.brand

  WHERE email_campaigns.id = $1
        AND email_campaigns_recipients.recipient_type = 'AllContacts'
        AND contacts.deleted_at IS NULL
        AND LENGTH(contacts.email[1]) > 0
),

brand_recs AS (
  SELECT
    email_campaigns_recipients.*
  FROM email_campaigns
    JOIN email_campaigns_recipients ON email_campaigns_recipients.campaign = email_campaigns.id

    WHERE email_campaigns.id = $1
          AND email_campaigns_recipients.recipient_type = 'Brand'
),

brand_agents AS (
  SELECT ba.*, brand_recs.send_type
  FROM   brand_recs, get_brand_agents(brand_recs.brand) ba
),

brand_recipients AS (
  SELECT    users.email, contacts_users.contact, brand_agents.send_type
  FROM      brand_agents
  JOIN      users          ON users.id = brand_agents.user
  LEFT JOIN contacts_users ON contacts_users.user = users.id
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

-- We used to DISTINCT ON(email). That was the behavior we wanted.
-- However, there was a bug, that forces me to DISTINCT ON(email, send_type).
-- Mailgun has a limitation that there must ALWAYS be an at least one TO recipient.
-- Therefore, you cannot send an email with only a BCC field.
-- That is respected in the user interface and we don't allow users to create such campaigns.
-- However, if we do DISTINCT(email), some rows will be removed if there are duplicates,
-- And it is possible that we remove the TO fields, which might leave the campaign
-- With no TO recipients, and therefore, rendering the whole campaign in a bogus state
-- Which could not be sent.
-- A campaign like this:
-- TO:  a@a.com
-- BCC: a@a.com b@b.com c@c.com

-- When we DISTINCT ON(email), the resulting campaign will look like
-- BCC: a@a.com b@b.com c@c.com
-- Which is bogus, as it has no TO recipients.

-- The only downside is, I really wanted us to unique the recipient list.
-- But now, they are unique per-recipient-type,
-- Therefore if you have a recipient in both CC and BCC, he _will_ receive dupes.

-- This may actually be better though I don't know.

SELECT DISTINCT ON(email, send_type) * FROM all_emails
WHERE email IS NOT NULL
