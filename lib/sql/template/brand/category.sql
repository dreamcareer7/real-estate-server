SELECT   template_type,
         medium
FROM     brands_allowed_templates bat
JOIN     templates
ON       bat.template = templates.id
WHERE    bat.brand IN
         (
                SELECT Brand_parents(brand_ids)
                FROM   Unnest($1::uuid[]) brand_ids)
AND      deleted_at IS NULL
GROUP BY template_type,
         medium