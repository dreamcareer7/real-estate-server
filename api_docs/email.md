# Group Email Campaigns

## Overview

There are several models associated with emails which are similar and must not be confused.

### Email Campaign

It's a collection of 1 or more emails sent withing a campaign so they could be tracked together.
Emails can have multiple recipients including email addresses, tags or lists.

They can also be scheduled to be sent in the future.

#### Data model

An `email_campaign` object will look like this:

| Field                | Type                      | association                 
| -------------------- | ------------------------- | ----------------------------
| id                   | uuid                      |                             
| created_at           | number                    |                             
| updated_at           | number                    |                             
| deleted_at           | number                    |                             
| created_by           | uuid                      |                             
| brand                | uuid                      |                             
| due_at               | number                    |                             
| executed_at          | number                    |                             
| subject              | string                    |                             
| html                 | string                    |                             
| text                 | string                    |                             
| headers              | json                      |                             
| include_signature    | boolean                   |                             
| individual           | boolean                   |                             
| google_credential    | uuid                      |                             
| microsoft_credential | uuid                      |                             
| accepted             | number                    |                             
| clicked              | number                    |                             
| complained           | number                    |                             
| delivered            | number                    |                             
| failed               | number                    |                             
| opened               | number                    |                             
| rejected             | number                    |                             
| sent                 | number                    |                             
| stored               | number                    |                             
| unsubscribed         | number                    |                             
| deal                 | Deal                      | `email_campaign.deal`       
| from                 | User                      | `email_campaign.from`       
| attachments          | EmailCampaignAttachment[] | `email_campaign.attachments`
| recipients           | EmailCampaignRecipient[]  | `email_campaign.recipients` 
| emails               | EmailCampaignEmail[]      | `email_campaign.emails`     
| template             | TemplateInstance          | `email_campaign.template`   

### Email Campaign Recipient

Each email campaign can container 1 or more recipients.

Each recipient could be any of the following:

- All contacts
- An pair of (email, contact) where contact id is optional
- A CRM list
- A CRM tag
- A MLS agent from agent network
- A brand to send to all its agents

#### Data model

An `email_campaign_recipient` object type looks like this:

| Field          | Type    | association | Description |
| -------------- | ------- | ----------- | ----------- |
| id             | uuid    |             |
| created_at     | number  |             |
| deleted_at     | number  |             |
| updated_at     | number  |             |
| campaign       | uuid    |             |
| agent          | Agent   |             |
| brand          | Brand   |             |
| contact        | Contact |             |
| email          | string  |             |
| id             | uuid    |             |
| list           | CrmList |             |
| recipient_type | Enum \* |             |
| send_type      | Enum \* |             |
| tag            | string  |             |

List of possible values for `recipient_type`:

* `Tag`: campaign will be sent to the primary email of all contacts matching a tag
* `List`: campaign will be sent to the primary email of all contacts in a crm list
* `Brand`: campaign will be sent to all of agent users in the brand
* `AllContacts`: campaign will be sent to the primary email of all contacts in the brand
* `Email`: campaign will be sent to the specified email address and optionally associated with the provided contact
* `Agent`: campaign will be sent to the mls agent from the agent network

List of possible values for `send_type`:

* `To`
* `CC`
* `BCC`

### Email

One individual email which has already been sent.

### Email Campaign Email

A model that connects Email Campaigns with Emails.

### Google Credential

A model that connects Email Campaigns with Google_Credentials.

### Microsoft Credential

A model that connects Email Campaigns with Microsoft_Credentials.

### Email Campaign Attachments

A model that connects Email Campaigns with Email_Campaign_Attachments
* It is not allowed to send both file and url alongside each other.
* Combination of url and name is mandatory. 

#### Data model

An `email_campaign_attachments` object type looks like this:

| Field        | Type      | association | Description |
| ------------ | --------- | ----------- | ----------- |
| id           | uuid      |             | NOT NULL
| campaign     | uuid      |             | NOT NULL
| file         | uuid      |             | NOT NULL
| is_inline    | boolean   |             | NOT NULL
| content_id   | text      |             |
| created_at   | timestamp |             |
| updated_at   | timestamp |             |
| deleted_at   | timestamp |             |


### Upload an Attachment [POST /emails/attachments]
* Tip: `origin` query parameter can be either of `gmail`, `outlook`, or `mailgun`.
* Gmail limit: 26 MB (Single Attachment up to 26MB  or Several attachments with the sum of file sizes up to 26MB)
* Outlook limit: Same as Gmail
* Mailgun limit: 15 MB
<!-- include(tests/email/uploadAttachment.md) -->

### Schedule an email campaign [POST /emails]
<!-- include(tests/email/schedule.md) -->

### Update an email campaign [PUT /emails/:id]
<!-- include(tests/email/update.md) -->

### Update an email campaign's notifications_enabled [PUT /emails/:id/notifications]
<!-- include(tests/email/enableDisableNotification.md) -->

### Get an email campaign [GET /emails/:id?associations[]=email_campaign.emails]
<!-- include(tests/email/get.md) -->

### Get all campaigns by brand [GET /brands/:brand/emails/campaigns]
<!-- include(tests/email/getByBrand.md) -->

### Schedule a gmail message [POST /emails]
If either of `credential.deleted_at is not null` or `credentila.revoked is true` is met, then credential is disconnected.
So it should not be allowed to send or read an email if user's connected account is disconnected.

When a user wants to send an email through Gmail or Outlook, two conditions should be met.
* `credential.deleted_at is null` and `credentila.revoked is false`
* `credential.scope_summary` includes `mail.send`

Every Google and Microsoft connected account has a field with the name `scope_summary`.
This is all of our avaailable scopes: `["profile", "contacts", "mail.read", "mail.send", "mail.modify", "calendar"]`

When a user wants to update email IsRead flag, two conditions should be met.
* `credential.deleted_at is null` and `credentila.revoked is false`
* `credential.scope_summary` includes `mail.send and mail.modify`

<!-- include(tests/email/scheduleGmailMessage.md) -->

### Schedule a gmail message with attachments [POST /emails]
<!-- include(tests/email/scheduleEmailWithAttachments.md) -->

### Schedule an outlook message [POST /emails]
<!-- include(tests/email/scheduleOutlookMessage.md) -->

### Schedule a reply to gmail message [POST /emails]
* Tip: Use `message_ob.internet_message_id` for setting the `headers.in_reply_to`. You are replying to current message, so the `in_reply_to` of new reply-message should be a `internet_message_id` of previous message.
<!-- include(tests/email/scheduleReplyToGmailMessage.md) -->

### Schedule a reply to outlook message [POST /emails]
<!-- include(tests/email/scheduleReplyToOulookMessage.md) -->

### Get a gmail campaign [GET /emails/:id?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign.attachments]
<!-- include(tests/email/getGmailCampaign.md) -->

### Get an outlook campaign [GET /emails/:id]
<!-- include(tests/email/getOulookCampaign.md) -->

### Update message's IsRead status  [PUT /emails/google/:credentialId/messages/:messageId}]
<!-- include(tests/email/updateIsRead.md) -->

### Batch update some messages IsRead status [PUT /emails/google/:credentialId/messages}]
<!-- include(tests/email/batchUpdateIsRead.md) -->

### Batch move to trash [POST /emails/google/:credentialId/trash}]
<!-- include(tests/email/batchTrash.md) -->

### Batch archive [POST /emails/google/:credentialId/archive}]
<!-- include(tests/email/batchArchive.md) -->



