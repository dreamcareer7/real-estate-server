CREATE MATERIALIZED VIEW agents_phones AS (
  WITH stated_phones AS (
    SELECT
      ('phone_number_' || id) as id,
      id as agent,
      phone_number as phone,
      matrix_modified_dt as date
    FROM agents
    WHERE phone_number <> ''
  ),

  stated_work_phones AS (
    SELECT
      ('work_phone' || id) as id,
      id as agent,
      work_phone as phone,
      matrix_modified_dt as date
    FROM agents
    WHERE work_phone <> ''
  ),

  list_agents AS (
    SELECT
      ('list_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.list_agent_mui),
      list_agent_direct_work_phone as phone,
      list_date as date
    FROM listings
    WHERE
      list_agent_direct_work_phone <> ''
  ),

  co_list_agents AS (
    SELECT
      ('co_list_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.co_list_agent_mui),
      co_list_agent_direct_work_phone as phone,
      list_date as date
    FROM listings
    WHERE
      co_list_agent_direct_work_phone <> ''
  ),

  selling_agents AS (
    SELECT
      ('selling_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.selling_agent_mui),
      selling_agent_direct_work_phone as phone,
      list_date as date
    FROM listings
    WHERE
      selling_agent_direct_work_phone <> ''
  ),

  co_selling_agents AS (
    SELECT
      ('co_selling_agents_' || id) as id,
      (SELECT id FROM agents WHERE agents.mls = listings.mls AND agents.matrix_unique_id = listings.co_selling_agent_mui),
      co_selling_agent_direct_work_phone as phone,
      list_date as date
    FROM listings
    WHERE
      co_selling_agent_direct_work_phone <> ''
  )

  SELECT * FROM stated_phones
  UNION ALL
  SELECT * FROM stated_work_phones
  UNION ALL
  SELECT * FROM list_agents
  UNION ALL
  SELECT * FROM co_list_agents
  UNION ALL
  SELECT * FROM selling_agents
  UNION ALL
  SELECT * FROM co_selling_agents
);

CREATE UNIQUE INDEX agents_phones_idx ON agents_phones (id);
CREATE INDEX agents_phones_phone ON agents_phones (phone);
CREATE INDEX agents_phones_agent ON agents_phones (agent);
