INSERT INTO dailies ("user", timezone, email)
SELECT "user", timezone, email
FROM json_populate_recordset(NULL::dailies, $1::json)
RETURNING id
