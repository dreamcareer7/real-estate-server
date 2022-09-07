SELECT   template_type,
         medium
FROM     (
                SELECT template_type,
                       medium
                FROM   brands_allowed_templates bat
                JOIN   templates
                ON     bat.template = templates.id
                WHERE  '1' = $4 
                AND
                bat.brand IN
                       (
                              SELECT Brand_parents(brand_ids)
                              FROM   unnest($1::uuid[]) brand_ids)
                AND ($2::template_type[]   IS NULL OR $2 @> ARRAY[templates.template_type])
                AND ($3::template_medium[] IS NULL OR $3 @> ARRAY[templates.medium])
                AND    deleted_at IS NULL
                UNION ALL
                SELECT template_type,
                       medium
                FROM   brands_assets
                WHERE  '1' = $5
                AND 
                brand IN
                       (
                              SELECT brand_parents(brand_ids)
                              FROM   unnest($1::uuid[]) brand_ids)
                AND ($2::template_type[]   IS NULL OR $2 @> ARRAY[brands_assets.template_type])
                AND ($3::template_medium[] IS NULL OR $3 @> ARRAY[brands_assets.medium])                              
                AND    deleted_at IS NULL) AS data
GROUP BY template_type,
         medium         