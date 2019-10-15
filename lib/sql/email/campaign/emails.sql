WITH
list_contacts AS (
  SELECT
    contacts.email[1]                    as email,
    contacts.id                          as contact,
    null::uuid                           as agent,
    email_campaigns_recipients.send_type as send_type
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
  SELECT
    contacts.email[1]                    as email,
    contacts.id                          as contact,
    null::uuid                           as agent,
    email_campaigns_recipients.send_type as send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id =  email_campaigns_recipients.campaign
  JOIN   contacts         ON ARRAY[email_campaigns_recipients.tag] <@ contacts.tag
         AND email_campaigns.brand = contacts.brand

  WHERE email_campaigns_recipients.recipient_type = 'Tag'
        AND email_campaigns.id = $1
        AND contacts.deleted_at IS NULL
),

contact_recipients AS (
  SELECT
    COALESCE(email_campaigns_recipients.email, contacts.email[1]) as email,
    contacts.id                                                   as contact,
    null::uuid                                                    as agent,
    email_campaigns_recipients.send_type                          as send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id = email_campaigns_recipients.campaign
  JOIN   contacts         ON email_campaigns_recipients.contact = contacts.id
         AND email_campaigns.brand = contacts.brand

  WHERE email_campaigns_recipients.recipient_type = 'Email'
        AND email_campaigns.id = $1
        AND contacts.deleted_at IS NULL
),

all_contacts_recipients AS (
  SELECT
    contacts.email[1]                    as email,
    contacts.id                          as contact,
    null::uuid                           as agent,
    email_campaigns_recipients.send_type as send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id    = email_campaigns_recipients.campaign
  JOIN   contacts                   ON email_campaigns.brand = contacts.brand

  WHERE email_campaigns.id = $1
        AND email_campaigns_recipients.recipient_type = 'AllContacts'
        AND contacts.deleted_at IS NULL
        AND LENGTH(contacts.email[1]) > 0
),

all_brand_agents AS (
  SELECT
    u.email       as email,
    c.id          as contact,
    null::uuid    as agent,
    ecr.send_type as send_type
  FROM
    email_campaigns AS ec
    JOIN email_campaigns_recipients AS ecr
      ON ec.id = ecr.campaign
    CROSS JOIN LATERAL get_brand_agents(ecr.brand) AS ba
    JOIN users AS u
      ON ba."user" = u.id
    LEFT JOIN contacts_users AS cu
      ON cu."user" = u.id
    LEFT JOIN contacts AS c
      ON c.id = cu.contact
  WHERE
    ec.id = $1
    AND ecr.recipient_type = 'Brand'
    AND (
      c.id IS NULL OR (
        c.brand = ec.brand
        AND c.deleted_at IS NULL
      )
    )
    AND ecr.deleted_at IS NULL
),

agent_recipients AS (
  SELECT
    agents.email                         as email,
    null::uuid                           as contact,
    email_campaigns_recipients.agent     as agent,
    email_campaigns_recipients.send_type as send_type
  FROM   email_campaigns
  JOIN   email_campaigns_recipients ON email_campaigns.id = email_campaigns_recipients.campaign
  JOIN   agents                     ON email_campaigns_recipients.agent= agents.id

  WHERE email_campaigns_recipients.recipient_type = 'Agent'
    AND email_campaigns.id = $1
),

all_emails AS (
  SELECT
    email,
    null as contact,
    null as agent,
    send_type
  FROM email_campaigns_recipients
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
  SELECT * FROM all_brand_agents
  UNION
  SELECT * FROM agent_recipients
)

-- We used to DISTINCT ON(email).
-- However, there was a bug.
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


-- So now, by ordering by send_type, we make sure
-- a recipient will be a TO recipient if he is both a TO and CC/BCC.

SELECT DISTINCT ON(email) * FROM all_emails
WHERE email IS NOT NULL
ORDER BY email, (
  CASE
    WHEN send_type = 'To'::email_campaign_send_type THEN 0
    ELSE 1
  END
) ASC;
