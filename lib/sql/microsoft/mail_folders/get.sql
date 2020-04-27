SELECT
    *, 'microsoft_mail_folder' AS type
FROM
    microsoft_mail_folders
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(mfid, ord)
ON 
    microsoft_mail_folders.id = mfid
ORDER BY 
    t.ord