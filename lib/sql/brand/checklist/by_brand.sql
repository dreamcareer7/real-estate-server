-- This query returns all brand checklist for a brand and all it's parent's.
-- Parents should come last. BrandChecklist.createWithTasks depends on that.

SELECT id FROM brands_checklists 
JOIN brand_parents($1) WITH ORDINALITY AS b(i,n) ON brands_checklists.brand = b.i 
WHERE deleted_at IS NULL 
ORDER BY n ASC;