CREATE MATERIALIZED VIEW agents_emails AS (
  WITH stated_emails AS (
    SELECT ('email_' || id) as id, matrix_unique_id as mui, email, matrix_modified_dt as date
    FROM agents
    WHERE email <> ''
  ),

  list_agents AS (
    SELECT
      ('list_agents_' || id) as id, list_agent_mui as mui, list_agent_email as email, list_date as date
    FROM listings
    WHERE
      list_agent_email <> ''
  ),

  co_list_agents AS (
    SELECT
      ('co_list_agents_' || id) as id, co_list_agent_mui as mui, co_list_agent_email as email, list_date as date
    FROM listings
    WHERE
      co_list_agent_email <> ''
  ),

  selling_agents AS (
    SELECT
      ('selling_agents_' || id) as id, selling_agent_mui as mui, selling_agent_email as email, list_date as date
    FROM listings
    WHERE
      selling_agent_email <> ''
  ),

  co_selling_agents AS (
    SELECT
      ('co_selling_agents_' || id) as id, co_selling_agent_mui as mui, co_selling_agent_email as email, list_date as date
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
CREATE INDEX agents_emails_email ON agents_emails (email);
CREATE INDEX agents_emails_mui ON agents_emails (mui);