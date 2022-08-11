CREATE OR REPLACE VIEW email_campaigns_recipient_emails AS ((
    SELECT
      campaign,
      ecr.email,
      c.id AS contact,
      NULL::uuid AS agent,
      send_type
    FROM
      email_campaigns AS ec
      JOIN email_campaigns_recipients AS ecr
        ON ec.id = ecr.campaign
      -- in case of assigned contacts, 'c' will be NULL but it's fine:
      LEFT JOIN contacts AS c
        ON ((c.email && ARRAY[ecr.email]) AND (c.brand = ec.brand) AND (c.deleted_at IS NULL))
    WHERE
      ecr.email IS NOT NULL
      AND ecr.contact IS NULL
      AND ecr.deleted_at IS NULL
      AND recipient_type = 'Email'
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      contacts.email[1] AS email,
      contacts.id AS contact,
      null::uuid AS agent,
      email_campaigns_recipients.send_type as send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id = email_campaigns_recipients.campaign
      JOIN crm_lists_members
        ON email_campaigns_recipients.list = crm_lists_members.list
      JOIN contacts
        ON (crm_lists_members.contact = contacts.id AND
            check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from))
    WHERE
      email_campaigns_recipients.recipient_type = 'List'
      AND contacts.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
      AND crm_lists_members.deleted_at IS NULL
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      contacts.partner_email AS email,
      contacts.id AS contact,
      null::uuid AS agent,
      email_campaigns_recipients.send_type as send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id = email_campaigns_recipients.campaign
      JOIN crm_lists_members
        ON email_campaigns_recipients.list = crm_lists_members.list
      JOIN contacts
        ON (crm_lists_members.contact = contacts.id AND
            check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from))
    WHERE
      email_campaigns_recipients.recipient_type = 'List'
      AND contacts.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
      AND crm_lists_members.deleted_at IS NULL
      AND contacts.partner_email IS NOT NULL
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      contacts.email[1] AS email,
      contacts.id AS contact,
      NULL::uuid AS agent,
      email_campaigns_recipients.send_type as send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id =  email_campaigns_recipients.campaign
      JOIN contacts
        ON check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from)
      JOIN UNNEST(contacts.tag) AS ct
        ON LOWER(ct) = LOWER(email_campaigns_recipients.tag)
    WHERE
      email_campaigns_recipients.recipient_type = 'Tag'
      AND contacts.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      contacts.partner_email AS email,
      contacts.id AS contact,
      NULL::uuid AS agent,
      email_campaigns_recipients.send_type as send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id =  email_campaigns_recipients.campaign
      JOIN contacts
        ON check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from)
      JOIN UNNEST(contacts.tag) AS ct
        ON LOWER(ct) = LOWER(email_campaigns_recipients.tag)
    WHERE
      email_campaigns_recipients.recipient_type = 'Tag'
      AND contacts.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
      AND contacts.partner_email IS NOT NULL
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      COALESCE(email_campaigns_recipients.email, contacts.email[1]) as email,
      contacts.id AS contact,
      NULL::uuid AS agent,
      email_campaigns_recipients.send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id = email_campaigns_recipients.campaign
      JOIN contacts
        ON (email_campaigns_recipients.contact = contacts.id AND
            check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from))
    WHERE
      email_campaigns_recipients.recipient_type = 'Email'
      AND contacts.deleted_at IS NULL
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      contacts.email[1]  AS email,
      contacts.id        AS contact,
      NULL::uuid         AS agent,
      email_campaigns_recipients.send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id = email_campaigns_recipients.campaign
      JOIN contacts
        ON check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from)
    WHERE
      email_campaigns_recipients.recipient_type = 'AllContacts'
      AND contacts.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
      AND LENGTH(contacts.email[1]) > 0
  ) UNION (
    SELECT
      email_campaigns.id     AS campaign,
      contacts.partner_email AS email,
      contacts.id            AS contact,
      NULL::uuid             AS agent,
      email_campaigns_recipients.send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id = email_campaigns_recipients.campaign
      JOIN contacts
        ON check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from)
    WHERE
      email_campaigns_recipients.recipient_type = 'AllContacts'
      AND contacts.deleted_at IS NULL
      AND contacts.parked IS NOT TRUE
      AND LENGTH(contacts.email[1]) > 0
      AND contacts.partner_email IS NOT NULL
  ) UNION (
    SELECT
      ec.id         AS campaign,
      u.email       AS email,
      c.id          AS contact,
      null::uuid    AS agent,
      ecr.send_type
    FROM
      email_campaigns AS ec
      JOIN email_campaigns_recipients AS ecr
        ON ec.id = ecr.campaign
      CROSS JOIN LATERAL get_brand_agents(ecr.brand) AS ba
      JOIN users AS u
        ON ba."user" = u.id
      LEFT JOIN contacts_users AS cu
        ON cu."user" = u.id
      -- Again here seems there's no need to check_contact_read_access:
      LEFT JOIN contacts AS c
        ON c.id = cu.contact AND c.brand = ec.brand AND c.deleted_at IS NULL AND c.parked IS NOT TRUE
    WHERE
      ecr.recipient_type = 'Brand'
      AND ecr.deleted_at IS NULL
      AND ba.enabled = TRUE
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      agents.email,
      NULL::uuid as contact,
      email_campaigns_recipients.agent,
      email_campaigns_recipients.send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id = email_campaigns_recipients.campaign
      JOIN agents
        ON email_campaigns_recipients.agent = agents.id
    WHERE
      email_campaigns_recipients.recipient_type = 'Agent'
  ) UNION (
    SELECT
      email_campaigns.id AS campaign,
      contacts.email[1] as email,
      contacts.id AS contact,
      NULL::uuid AS agent,
      email_campaigns_recipients.send_type
    FROM
      email_campaigns
      JOIN email_campaigns_recipients
        ON email_campaigns.id = email_campaigns_recipients.campaign
      JOIN contacts
        ON (email_campaigns_recipients.contact = contacts.id AND
            check_contact_read_access(contacts, email_campaigns.brand, email_campaigns.from))
    WHERE
      email_campaigns_recipients.recipient_type = 'Contact'
      AND contacts.deleted_at IS NULL
      AND contacts.email IS NOT NULL
  ))
