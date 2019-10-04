CREATE MATERIALIZED VIEW agents_phones AS (
  WITH stated_phones AS (
    SELECT
      ('phone_number_' || matrix_unique_id || mls) as id,
      matrix_unique_id as mui,
      mls,
      phone_number as phone,
      matrix_modified_dt as date
    FROM agents
    WHERE phone_number <> ''
  ),

  stated_work_phones AS (
    SELECT
      ('work_phone' || matrix_unique_id || mls) as id,
      matrix_unique_id as mui,
      mls,
      work_phone as phone,
      matrix_modified_dt as date
    FROM agents
    WHERE work_phone <> ''
  ),

  list_agents AS (
    SELECT
      ('list_agents_' || matrix_unique_id || mls) as id,
      matrix_unique_id as mui,
      mls,
      list_agent_direct_work_phone as phone,
      list_date as date
    FROM listings
    WHERE
      list_agent_direct_work_phone <> ''
  ),

  co_list_agents AS (
    SELECT
      ('co_list_agents_' || matrix_unique_id || mls) as id,
      matrix_unique_id as mui,
      mls,
      co_list_agent_direct_work_phone as phone,
      list_date as date
    FROM listings
    WHERE
      co_list_agent_direct_work_phone <> ''
  ),

  selling_agents AS (
    SELECT
      ('selling_agents_' || matrix_unique_id || mls) as id,
      matrix_unique_id as mui,
      mls,
      selling_agent_direct_work_phone as phone,
      list_date as date
    FROM listings
    WHERE
      selling_agent_direct_work_phone <> ''
  ),

  co_selling_agents AS (
    SELECT
      ('co_selling_agents_' || matrix_unique_id || mls) as id,
      matrix_unique_id as mui,
      mls,
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
CREATE INDEX agents_phones_agent ON agents_phones (mui, mls);
