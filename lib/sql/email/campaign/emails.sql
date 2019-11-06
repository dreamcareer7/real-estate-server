-- We used to DISTINCT ON(email).
-- However, there was a bug.
-- Mailgun has a limitation that there must ALWAYS be an at least one TO recipient.
-- Therefore, you cannot send an email with only a BCC field.
-- That is respected in the user interface and we don't allow users to create such campaigns.
-- However, if we do DISTINCT(email), some rows will be removed if there are duplicates,
-- And it is possible that we remove the TO fields, which might leave the campaign
-- With no TO recipients, and therefore, rendering the whole campaign in a bogus state
-- Which could not be sent.
-- A campaign like this:
-- TO:  a@a.com
-- BCC: a@a.com b@b.com c@c.com

-- When we DISTINCT ON(email), the resulting campaign will look like
-- BCC: a@a.com b@b.com c@c.com
-- Which is bogus, as it has no TO recipients.


-- So now, by ordering by send_type, we make sure
-- a recipient will be a TO recipient if he is both a TO and CC/BCC.

SELECT DISTINCT ON(LOWER(email))
  *
FROM
  email_campaigns_recipient_emails
WHERE
  email IS NOT NULL
  AND campaign = $1
ORDER BY email, (
  CASE
    WHEN send_type = 'To'::email_campaign_send_type THEN 0
    ELSE 1
  END
) ASC;
