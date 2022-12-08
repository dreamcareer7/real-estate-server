WITH ins1 AS (
  INSERT INTO distribution_lists
    (title)
   VALUES
    ($5)
  RETURNING id  
), ins2 AS (
    INSERT INTO distribution_lists_contacts
    (email, first_name, last_name, title, city, state, postal_code, country, phone, distribution)
    select $1, $2, $3, $4, $5, $6, $7, $8, $9, id from ins1 
    RETURNING id
)
update mls_info set enable_agent_network = false where mls = $10  RETURNING id
