CREATE OR REPLACE FUNCTION propose_brand_agents(brand_id uuid, "user_id" uuid) RETURNS TABLE(
  "agent" uuid,
  "user" uuid,
  mlsid text,
  is_me boolean,
  has_contact boolean
)
AS
$$
  SELECT
  brand_agents.agent as "agent",
  brand_agents.user as "user",
  brand_agents.mlsid as mlsid,
  (
    CASE WHEN "user_id"::uuid IS NULL THEN false
        WHEN brand_agents.user = "user_id"::uuid THEN true
        ELSE false
    END
  )::boolean as is_me,
  (
    CASE WHEN "user_id"::uuid IS NULL THEN false ELSE
    (
      SELECT user_has_contact_with_another("user_id", brand_agents.user)
    ) END
  )::boolean as has_contact
  FROM get_brand_agents(brand_id) brand_agents
$$
LANGUAGE sql;