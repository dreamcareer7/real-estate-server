# Group Calendar

## Overview

This document describes the set of APIs used in the calendar view.

### Data Model

A `calendar_event` object is a common representation of event-like objects throughout Rechat system.

| Field          |  Type   | Description                                                                                               |
| -------------- | :-----: | --------------------------------------------------------------------------------------------------------- |
| id             | string  | Id of the underlying event-like object                                                                    |
| created_by     |  uuid   |                                                                                                           |
| created_at     | number  |                                                                                                           |
| updated_at     | number  |                                                                                                           |
| brand          |  uuid   |                                                                                                           |
| object_type    |  Enum   | Type of the underlying object. `crm_task` or `deal_context` or `contact_attribute`                        |
| event_type     | string  | Type of the event. Used to infer icons on calendar events.                                                |
| type_label     | string  | Label used for type column in the Web UI.                                                                 |
| timestamp      | number  | The exact timestamp of the event. In case of recurring events, the original user input is returned.       |
| end_date       | number  | End time of the event, if defined.                                                                        |
| recurring      | boolean | Whether this a recurring event or not. Currently only applies to `birthday` and `important_date`          |
| next_occurance | number  | Next time the event is supposed to occur, if it's a recurring event.                                      |
| title          | string  | Title of the event record. Usually enough for direct use on clients.                                      |
| crm_task       |  uuid   | Related crm_task object                                                                                   |
| deal           |  uuid   | Related deal object                                                                                       |
| contact        |  uuid   | related contact object                                                                                    |
| campaign       |  uuid   | related email campaign                                                                                    |
| thread_key     | string  | related email thread key                                                                                  |
| people_len     | number  | Total number of people associated with the event. Meant to be used in conjuction with people association. |
| metadata       |  json   | arbitrary metadata associated with the event. usually holds data related to specific object types.        |

#### Associations

Associations defined for the `calendar_event` object are listed below.

| Association   | Type                            | Description                                                          |
| ------------- | ------------------------------- | -------------------------------------------------------------------- |
| people        | Mixed array of Contact or Agent | 5 items from contacts or agents associated with the event.           |
| full_crm_task | CrmTask                         | Separate association for the full crm_task object instead of id.     |
| full_deal     | Deal                            | Separate association for the full deal object instead of id.         |
| full_contact  | Contact                         | Separate association for the full contact object instead of id.      |
| full_campaign | EmailCampaign                   | Separate association for the full campaign object instead of id.     |
| activity      | Activity                        | Separate association for the full activity object instead of id.     |
| full_thread   | EmailThread                     | Separate association for the full email_thread object instead of id. |

#### Object types

Since calendar events come from all sorts of different sources, an `object_type` field is given in each event that indicates the entity type from which the event has originated from.

Due to some performance considerations, calendar events have two representations in the calendar API, depending on whether they are intended to be queried for associated objects or not. For instance, a `crm_task` object type has another representation, `crm_association` which is used to query crm events for a specific contact, deal or listing. The full list of object types and their dual representation is given in the following table:

| Object type         | Dual representation        | Dual is per each             | Description                                          |
| ------------------- | -------------------------- | ---------------------------- | ---------------------------------------------------- |
| `contact`           | `contact`                  | `contact`                    | contact next touch dates                             |
| `contact_attribute` | `contact_attribute`        | `contact`                    | contact touch dates like birthdays and anniversaries |
| `deal_context`      | -                          |                              | deal critical dates                                  |
| `crm_task`          | `crm_association`          | `contact`, `deal`, `listing` | normal CRM events                                    |
| `email_campaign`    | `email_campaign_recipient` | `contact`                    | email campaigns, both scheduled and executed         |
| `email_thread`      | `email_thread_recipient`   | `contact`                    | synchronized email threads                           |
| `activity`          | `activity`                 | `contact`                    | activities of client users associated with a contact |

Note that if you request a dual object type without specifying a filter on an associated object (mostly `contact`), you'll get several copies of the same events per each of those associated objects. In essense, duals have been provided to perform queries on associated objects with good performance.

**Tip:** As a rule of thumb, always use the dual object type when querying events for a specific contact, to build a timeline view for instance.

#### Event types

Possible values for `event_type` field are:

- If `object_type` = `crm_task` or `crm_association`:
  - `Call`
  - `Message`
  - `Todo`
  - `Closing`
  - `Inspection`
  - `Tour`
  - `Listing appointment`
  - `Follow up`
  - `Open House`
- If `object_type` = `deal_context`:
  - `list_date`
  - `expiration_date`
  - `contract_date`
  - `inspection_date`
  - `option_period`
  - `financing_due`
  - `title_due`
  - `t47_due`
  - `closing_date`
  - `possession_date`
  - `lease_executed`
  - `lease_application_date`
  - `lease_begin`
  - `lease_end`
  - `home_anniversary` (this is a virtual event type coming from `closing_date` or `lease_end`)
- If `object_type` = `contact_attribute`:
  - `birthday`
  - `child_birthday`
  - `wedding_anniversary`
  - `home_anniversary`
  - `work_anniversary`
  - any other custom attribute with a date type
- If `object_type` = `email_campaign`:
  - `scheduled_email`
  - `executed_email`
- If `object_type` = `email_thread`:
  - `gmail`
  - `outlook`
- If `object_type` = `activity`:
  - possible activity types is too long and the list can grow even longer

### Get Calendar events [GET /calendar]
<!-- include(tests/analytics/getCalendar.md) -->

### Get iCal feed url [GET /calendar/feed]
<!-- include(tests/analytics/getCalendarFeedUrl.md) -->

### Get global notification settings [GET /calendar/settings/notifications]
<!-- include(tests/analytics/getCalendarNotificationSettings.md) -->

### Set global notification settings [PUT /calendar/settings/notifications]
<!-- include(tests/analytics/setCalendarNotificationSettings.md) -->
