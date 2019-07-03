CREATE MATERIALIZED VIEW agents_emails AS (
  WITH stated_emails AS (
    SELECT
      ('email_' || id) as id,
      id as agent,
      email,
      matrix_modified_dt as date
    FROM agents
    WHERE email <> ''
  ),

  list_agents AS (
    SELECT
      ('list_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.list_agent_mui),
      list_agent_email as email,
      list_date as date
    FROM listings
    WHERE
      list_agent_email <> ''
  ),

  co_list_agents AS (
    SELECT
      ('co_list_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.co_list_agent_mui),
      co_list_agent_email as email,
      list_date as date
    FROM listings
    WHERE
      co_list_agent_email <> ''
  ),

  selling_agents AS (
    SELECT
      ('selling_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.selling_agent_mui),
      selling_agent_email as email,
      list_date as date
    FROM listings
    WHERE
      selling_agent_email <> ''
  ),

  co_selling_agents AS (
    SELECT
      ('co_selling_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.co_selling_agent_mui),
      co_selling_agent_email as email,
      list_date as date
    FROM listings
    WHERE
      co_selling_agent_email <> ''
  )

  SELECT * FROM stated_emails
  UNION ALL
  SELECT * FROM list_agents
  UNION ALL
  SELECT * FROM co_list_agents
  UNION ALL
  SELECT * FROM selling_agents
  UNION ALL
  SELECT * FROM co_selling_agents
);

CREATE UNIQUE INDEX agents_emails_idx ON agents_emails (id);
CREATE INDEX agents_emails_email ON agents_emails (LOWER(email));
CREATE INDEX agents_emails_agent ON agents_emails (agent);
