#Group Emails

## Overview

There are several models associated with emails which are similar and must not be confused:

1. Email Campaign

It's a collection of 1 or more emails sent withing a campaign so they could be tracked together.
Emails can have multiple recipients including email addresses, tags or lists.

They can also be scheduled to be sent in the future.

2. Email Campaign Recipient

Each email campaign can container 1 or more recipients.

Each recipient could be any of the following:

A. An pair of (email, contact)
B. A CRM List
C. A CRM Tag

3. Email

One individual email which has already been sent.

4. Email Campaign Email

A model that connects Email Campaigns with Emails.

### Schedule an email campaign [POST /emails]
<!-- include(tests/email/scheudle.md) -->

### Get an email campaign [GET /emails/:id?associations[]=email_campaign.emails]
<!-- include(tests/email/get.md) -->

### Get all campaigns by brand [GET /brands/:brand/emails/campaigns]
<!-- include(tests/email/getByBrand.md) -->
