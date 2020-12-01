# Group Email Threads

## Overview

When emails are synchronized from Gmail, Outlook or other external sources, we show them in threads and not as individual emails. This way, users can follow each conversation in a proper context and quickly take a required action.

Rechat has 3 repositories of emails:

- Gmail integration
- Outlook integration
- Emails sent from Mailgun

Based on this, email threads will always be either Gmail-only or Outlook-only, with a potential Mailgun email at the very beginning of the thread.

##### Data model

An `email_thread` object looks like this:

| Field                | Type                 | Association             | Description              |
| -------------------- | -------------------- | ----------------------- | ------------------------ |
| id                   | UUID                 |                         |                          |
| created_at           | number               |                         |                          |
| updated_at           | number               |                         |                          |
| brand                | UUID                 |                         |                          |
| user                 | UUID                 |                         |                          |
| google_credential    | UUID                 |                         |                          |
| microsoft_credential | UUID                 |                         |                          |
| subject              | string               |                         |                          |
| first_message_date   | number               |                         |                          |
| last_message_date    | number               |                         |                          |
| recipients           | string[]             |                         | Array of email addresses |
| message_count        | number               |                         |                          |
| has_attachments      | boolean              |                         |                          |
| is_read              | boolean              |                         |                          |
| messages             | EmailThreadMessage[] | `email_thread.messages` |                          |
| contacts             | Contact[]            | `email_thread.contacts` |                          |
| type                 | `'email_thread'`     |                         |                          |

The type `EmailThreadMessage` is defined as one of:

- `GoogleMessage` (type: `google_message`)
- `MicrosoftMessage` (type: `microsoft_message`)
- `Email` (type: `email`)


### Request to partial sync [POST /emails/threads]
<!-- include(tests/email/syncThreadsByContact.md) -->