# Group Brand Flows

## Overview

A _BrandFlow_ is a series of touch point templates that can help the agents drive deeper engagement with their contacts and make sure the right sales activities are always conducted. It is comprised of a set of _BrandFlowStep_'s that can be either an event or email template.

### BrandFlow

A _BrandFlow_'s data model is described in the table below:

Field                   | Type           | association           | Description
------------------------|:--------------:|-----------------------|---------------------------------------
id                      | uuid           |                       | Internal identifier of the object
created_at              | number         |                       |
updated_at              | number         |                       |
deleted_at              | number         |                       |
created_by              | User           | brand_flow.created_by | User who created this object
updated_by              | User           | brand_flow.updated_by | User who created this object
brand                   | Brand          | brand_flow.brand      | The team this object belongs to
name                    | string         |                       | Name of the flow
description             | string         |                       | A description of what the flow does
steps                   | BranFlowStep[] | brand_flow.steps      | Name of the flow


### Get all brand flows [GET /brands/:id/flows]
<!-- include(tests/flow/getBrandFlows.md) -->

### Create a new brand flow [POST /brands/:id/flows]
<!-- include(tests/flow/addFlow.md) -->

### Enroll contacts to a flow [POST /crm/flows]
<!-- include(tests/flow/enroll) -->
