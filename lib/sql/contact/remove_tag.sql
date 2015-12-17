DELETE FROM tags
WHERE entity = $1 AND tag = $2 AND type = 'contact'
