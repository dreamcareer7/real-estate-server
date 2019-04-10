SELECT email_campaign_emails.*,
  'email_campaign_email' AS TYPE

FROM email_campaign_emails
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaign_emails.id = eid
ORDER BY t.ord
