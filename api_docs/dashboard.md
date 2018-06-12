# Group Dashboard

## Overview
This document describes the set of APIs used in the calendar view and analytical reports.

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

### Get Calendar events [GET /calendar]
<!-- include(tests/analytics/getCalendar.md) -->
