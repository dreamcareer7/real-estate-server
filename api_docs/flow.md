# Group Brand Flows

## Overview

A _BrandFlow_ is a series of touch point templates that can help the agents drive deeper engagement with their contacts and make sure the right sales activities are always conducted. It is comprised of a set of _BrandFlowStep_'s that can be either an event or email template.

### BrandFlow

A _BrandFlow_'s data model is described in the table below:

Field       | Type            | association             | Description
------------|:---------------:|-------------------------|---------------------------------------
id          | uuid            |                         | Internal identifier of the object
created_at  | number          |                         |
updated_at  | number          |                         |
deleted_at  | number          |                         |
created_by  | User            | `brand_flow.created_by` | User who created this object
updated_by  | User            | `brand_flow.updated_by` | User who created this object
brand       | Brand           | `brand_flow.brand`      | The team this object belongs to
name        | string          |                         | Name of the flow
description | string          |                         | A description of what the flow does
steps       | BrandFlowStep[] | `brand_flow.steps`      | Name of the flow

### BrandFlowStep

_BrandFlowStep_'s data model is described in the table below:

Field        | Type       | association                  | Description
-------------|:----------:|----------------------------  |---------------------------------------
id           | uuid       |                              | Internal identifier of the object
created_at   | number     |                              |
updated_at   | number     |                              |
deleted_at   | number     |                              |
created_by   | User       | `brand_flow_step.created_by` | User who created this object
updated_by   | User       | `brand_flow_step.updated_by` | User who created this object
title        | string     |                              | Title of the step
description  | string     |                              | A description of what the step is about
due_in       | number     |                              | Duration from flow starting point
email        | BrandEmail | `brand_flow_step.email`      | Link to an email template
event        | BrandEvent | `brand_flow_step.event`      | An event template
is_automated | boolean    |                              | Whether the step is automated or not

### Flow

_Flow_ is an instance of a _BrandFlow_ created for a single contact. It is linked to the brand flow by `origin` field. Its data model is described in the table below:

Field                   | Type       | association       | Description
------------------------|:----------:|-------------------|---------------------------------------
id                      | uuid       |                   | Internal identifier of the object
created_at              | number     |                   |
updated_at              | number     |                   |
deleted_at              | number     |                   |
created_by              | User       | `flow.created_by` | User who created this object
updated_by              | User       | `flow.updated_by` | User who created this object
brand                   | Brand      | `flow.brand`      | The team this object belongs to
origin                  | BrandFlow  | `flow.origin`     | Template this flow was created from
name                    | string     |                   | Name of the flow
description             | string     |                   | A description of what the flow does
starts_at               | number     |                   | Flow's epoch
contact                 | Contact    | `flow.contact`    | Contact enrolled in this flow
steps                   | FlowStep[] | `flow.steps`      | Array of flow's steps

### FlowStep

_FlowStep_'s data model is described in the table below:

Field      | Type          | association            | Description
-----------|:-------------:|------------------------|---------------------------------------
id         | uuid          |                        | Internal identifier of the object
created_at | number        |                        |
updated_at | number        |                        |
deleted_at | number        |                        |
created_by | User          | `flow_step.created_by` | User who created this object
updated_by | User          | `flow_step.updated_by` | User who created this object
flow       | uuid          |                        | Parent flow of the step
origin     | BrandFlowStep | `flow.origin`          | Link to the brand flow step
email      | EmailCampaign | `flow_step.email`      | Link to an actual email campaign
crm_task   | CrmTask       | `flow_step.crm_task`   | Link to an actual CrmTask object


### Get all brand flows [GET /brands/:id/flows]
<!-- include(tests/flow/getBrandFlows.md) -->

### Create a new brand flow [POST /brands/:id/flows]
<!-- include(tests/flow/addFlow.md) -->

### Enroll contacts to a flow [POST /crm/flows]
<!-- include(tests/flow/enroll.md) -->

### Stop a flow [DELETE /crm/flows/:id]
<!-- include(tests/flow/stop.md) -->

### Get flows a contact is enrolled to [GET /contacts/:id]
<!-- include(tests/flow/checkFlowAssociation.md) -->
