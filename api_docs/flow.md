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
created_by  | User            |                         | User who created this object
updated_by  | User            |                         | User who created this object
brand       | Brand           |                         | The team this object belongs to
name        | string          |                         | Name of the flow
description | string          |                         | A description of what the flow does
steps       | BrandFlowStep[] | `brand_flow.steps`      | Name of the flow
is_editable | boolean         |                         | Whether user can edit the entity

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
order        | number     |                              | Step's execution order in the flow
event_type   | string     |                              | A calendar event type, e.g. `birthday`
wait_for     | number     |                              | wait time from the actual time of the event trigger
time         | string     |                              | time of the day the action is supposed to be executed
email        | BrandEmail | `brand_flow_step.email`      | Link to an email template
event        | BrandEvent | `brand_flow_step.event`      | An event template
template     | Template   | `brand_flow_step.template`   | A raw marketing template
template_instance | TemplateInstance | `brand_flow_step.template_instance` | A rendered template instance from my designs
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
origin_id               | uuid       |                   | Template this flow was created from
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
campaign   | EmailCampaign | `flow_step.campaign    | Link to an actual email campaign
crm_task   | CrmTask       | `flow_step.crm_task`   | Link to an actual CrmTask object


### Get all brand flows [GET /brands/:id/flows]
<!-- include(tests/flow/getBrandFlows.md) -->

### Get brand flow by id [GET /brands/:id/flows/:flow]
<!-- include(tests/flow/getBrandFlowById.md) -->

### Create a new brand flow [POST /brands/:id/flows]
<!-- include(tests/flow/addFlow.md) -->

### Edit a brand flow [PUT /brands/:id/flows/:flow]
<!-- include(tests/flow/updateFlow.md) -->

### Delete a brand flow [DELETE /brands/:id/flows/:flow]
<!-- include(tests/flow/deleteFlow.md) -->

### Add a new step to a brand flow [POST /brands/:id/flows/:flow/steps]
<!-- include(tests/flow/addStepToFlow.md) -->

### Edit a brand flow step [PUT /brands/:id/flows/:flow/steps/:step]
<!-- include(tests/flow/editBrandFlowStep.md) -->

### Delete a brand flow step [DELETE /brands/:id/flows/:flow/steps/:step]
<!-- include(tests/flow/deleteFlowStep.md) -->

### Enroll contacts to a flow [POST /crm/flows]
<!-- include(tests/flow/enroll.md) -->

### Stop a flow [DELETE /crm/flows/:id]
<!-- include(tests/flow/stop.md) -->

### Get flows a contact is enrolled to [GET /contacts/:id]
<!-- include(tests/flow/checkFlowAssociation.md) -->
