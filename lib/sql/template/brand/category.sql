SELECT   distinct 
         template_type,
         medium
FROM     (
                SELECT template_type,
                       medium
                FROM   brands_allowed_templates bat
                JOIN   templates
                ON     bat.template = templates.id
                JOIN Brand_parents($1::uuid) AS bp(id)
                ON bat.brand = bp.id
                WHERE  
                '1' = $4 
                AND ($2::template_type[] IS NULL OR templates.template_type = ANY($2::template_type[]))
                AND ($3::template_medium[] IS NULL OR templates.medium = ANY($3::template_medium[]))
                AND deleted_at IS NULL
                UNION ALL
                SELECT template_type,
                       medium
                FROM   brands_assets
                JOIN Brand_parents($1::uuid) AS bp(id)
                ON brands_assets.brand = bp.id
                WHERE  
                '1' = $5
                AND ($2::template_type[] IS NULL OR brands_assets.template_type = ANY($2::template_type[]))
                AND ($3::template_medium[] IS NULL OR brands_assets.medium = ANY($3::template_medium[]))                         
                AND  deleted_at IS NULL
       ) AS data