DELETE FROM attachments_eav
WHERE object = $1 AND
      attachment = $2
