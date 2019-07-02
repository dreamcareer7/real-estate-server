SELECT email_campaign_emails.*,
  'email_campaign_email' AS TYPE,
  contacts.display_name,
  contacts.profile_image_url

FROM email_campaign_emails
LEFT JOIN  contacts ON email_campaign_emails.contact = contacts.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaign_emails.id = eid
ORDER BY t.ord
