SELECT
    *, 'google_mail_label' AS type
FROM
    google_mail_labels
JOIN 
    unnest($1::uuid[]) WITH ORDINALITY t(mfid, ord)
ON 
    google_mail_labels.id = mfid
ORDER BY 
    t.ord