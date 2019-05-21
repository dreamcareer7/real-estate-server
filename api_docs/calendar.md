# Group Calendar

## Overview
This document describes the set of APIs used in the calendar view.

### Data Model

A `calendar_event` object is a common representation of event-like objects throughout Rechat system.

Field       | Type         | Description
------------|:------------:|-----------------------------------------------------------------------------------
id          | uuid         | Id of the underlying event-like object
object_type | Enum         | Type of the underlying object. `crm_task` or `deal_context` or `contact_attribute`
event_type  | String       | Type of the event. Used to infer icons on calendar events.
type_label  | String       | Label used for type column in the Web UI.
timestamp   | number       | The exact timestamp of the event. In case of recurring events, the original user input is returned.
recurring   | String       | Whether this a recurring event or not. Currently only applies to `birthday` and `important_date`
title       | String       | **Reserved** Currently unused.
crm_task    | CrmTask      | Related crm_task object
deal        | Deal         | Related deal object
contact     | Contact      | related contact object

Possible values for `object_type` field are:

* `contact` for contact next touch dates
* `contact_attribute` for contact touch dates like birthdays and anniversaries
* `crm_task` for normal events
* `crm_association` special object type used for contact and deal timelines
* `email_campaign` for scheduled emails that will go out automatically
* `deal_context` for deal critical dates

Possible values for `event_type` field are:

* If `object_type` = `crm_task` or `crm_association`:
  * `Call`
  * `Message`
  * `Todo`
  * `Closing`
  * `Inspection`
  * `Tour`
  * `Listing appointment`
  * `Follow up`
  * `Open House`
* If `object_type` = `deal_context`:
  * `list_date`
  * `expiration_date`
  * `contract_date`
  * `inspection_date`
  * `option_period`
  * `financing_due`
  * `title_due`
  * `t47_due`
  * `closing_date`
  * `possession_date`
  * `lease_executed`
  * `lease_application_date`
  * `lease_begin`
  * `lease_end`
* If `object_type` = `contact_attribute`:
  * `birthday`
  * `important_date`
* If `object_type` = `email_campaign`:
  * `scheduled_email`
* If `object_type` = `contact`:
  * `next_touch`

### Get Calendar events [GET /calendar]
<!-- include(tests/analytics/getCalendar.md) -->

### Get iCal feed url [GET /calendar/feed]
<!-- include(tests/analytics/getCalendarFeedUrl.md) -->

### Get global notification settings [GET /calendar/settings/notifications]
<!-- include(tests/analytics/getCalendarNotificationSettings.md) -->

### Set global notification settings [PUT /calendar/settings/notifications]
<!-- include(tests/analytics/setCalendarNotificationSettings.md) -->
