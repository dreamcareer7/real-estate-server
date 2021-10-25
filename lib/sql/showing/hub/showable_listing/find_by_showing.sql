SELECT
  id
FROM
  showinghub.showable_listings AS s
WHERE
  showing = $1::uuid
