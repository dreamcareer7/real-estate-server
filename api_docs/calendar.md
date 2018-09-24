# Group Calendar

## Overview
This document describes the set of APIs used in the calendar view.

### Data Model

A `calendar_event` object is a common representation of event-like objects throughout Rechat system. There are three types of these objects which is indicated by `object_type` field:

* `crm_task`
* `deal_context` of type Date
* `contact_attribute` when it's `birthday` or an `important_date` attribute

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

Possible values for `event_type` field are:

* If `object_type` = `crm_task`:
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

### Get Calendar events [GET /calendar]
<!-- include(tests/analytics/getCalendar.md) -->

### Get iCal feed url [GET /calendar/feed]
<!-- include(tests/analytics/getCalendarFeedUrl.md) -->
