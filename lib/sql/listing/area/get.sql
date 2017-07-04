SELECT id,
       INITCAP(LOWER(title)) AS title,
       number,
       parent,
       'mls_area' AS type
FROM mls_areas
JOIN unnest($1::text[]) WITH ORDINALITY t(aid, ord) ON mls_areas.id = aid
