SELECT   template_type,
         medium
FROM     (
                SELECT template_type,
                       medium
                FROM   brands_allowed_templates bat
                JOIN   templates
                ON     bat.template = templates.id
                WHERE  bat.brand IN
                       (
                              SELECT Brand_parents(brand_ids)
                              FROM   unnest($1::uuid[]) brand_ids)
                AND    deleted_at IS NULL
                UNION ALL
                SELECT template_type,
                       medium
                FROM   brands_assets
                WHERE  brand IN
                       (
                              SELECT brand_parents(brand_ids)
                              FROM   unnest($1::uuid[]) brand_ids)
                AND    deleted_at IS NULL) AS data
GROUP BY template_type,
         medium         