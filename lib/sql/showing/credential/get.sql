SELECT
    id, "user", brand, username, password, last_crawled_at, login_status, selected_location, selected_location_string, 'showings_credentials' AS type
FROM
    showings_credentials
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(srid, ord)
ON 
    showings_credentials.id = srid
ORDER BY 
    t.ord