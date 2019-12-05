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



### Schedule an email campaign [POST /emails]
<!-- include(tests/email/schedule.md) -->

### Update an email campaign [PUT /emails/:id]
<!-- include(tests/email/update.md) -->

### Get an email campaign [GET /emails/:id?associations[]=email_campaign.emails]
<!-- include(tests/email/get.md) -->

### Get all campaigns by brand [GET /brands/:brand/emails/campaigns]
<!-- include(tests/email/getByBrand.md) -->

### Schedule a gmail message [POST /emails]
<!-- include(tests/email/scheduleGmailMessage.md) -->

### Schedule a gmail message with attachments [POST /emails]
<!-- include(tests/email/scheduleEmailWithAttachments.md) -->

### Schedule an outlook message [POST /emails]
<!-- include(tests/email/scheduleOulookMessage.md) -->

### Schedule a reply to gmail message [POST /emails]
<!-- include(tests/email/scheduleReplyToGmailMessage.md) -->

### Schedule a reply to outlook message [POST /emails]
<!-- include(tests/email/scheduleReplyToOulookMessage.md) -->

### Get a gmail campaign [GET /emails/:id?associations[]=email_campaign.emails&associations[]=email_campaign.recipients&associations[]=email_campaign.attachments]
<!-- include(tests/email/getGmailCampaign.md) -->

### Get an outlook campaign [GET /emails/:id]
<!-- include(tests/email/getOulookCampaign.md) -->