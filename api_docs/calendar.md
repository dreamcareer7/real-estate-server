# Group Calendar

## Overview

This document describes the set of APIs used in the calendar view.

### Data Model

A `calendar_event` object is a common representation of event-like objects throughout Rechat system.

| Field       |  Type  | Description                                                                                         |
| ----------- | :----: | --------------------------------------------------------------------------------------------------- |
| id          | String | Id of the underlying event-like object                                                              |
| object_type |  Enum  | Type of the underlying object. `crm_task` or `deal_context` or `contact_attribute`                  |
| event_type  | String | Type of the event. Used to infer icons on calendar events.                                          |
| type_label  | String | Label used for type column in the Web UI.                                                           |
| timestamp   | number | The exact timestamp of the event. In case of recurring events, the original user input is returned. |
| recurring   | String | Whether this a recurring event or not. Currently only applies to `birthday` and `important_date`    |
| title       | String | **Reserved** Currently unused.                                                                      |
| crm_task    |  UUID  | Related crm_task object                                                                             |
| deal        |  UUID  | Related deal object                                                                                 |
| contact     |  UUID  | related contact object                                                                              |
| campaign    |  UUID  | related email campaign                                                                              |
| thread_key  | String | related email thread key                                                                            |

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
