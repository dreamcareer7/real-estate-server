#Group Deal

## Overview

A _Deal_ holds information about a Real Estate Deal/Transaction.

Each deal has the following attributes:

* An MLS listing (Optional). (If the listing is missing, the deal is called a _Hippocket_)
* Brand this deal belongs to (Optional)
* Context. A key-value object consisting context of the deal (dates, prices, names, etc)
* Proposed Values. A key-value object consisting of values that we have extracted from
  different sources and we propose them to be used instead of context.
* Roles. People and the role they have in this deal.

### Context

A deal may consist of many different data that are gathered from different sources.
MLS, DCAD, user-submitted-forms and the user interfaces are current data sources.

::: note
All of the contexts are considered to be optional.
:::

contexts are stored in `deal.deal_context` object.
For example, `street_name` of a deal can be fetched from `deal.deal_context.street_name`.

[Here](https://gitlab.com/rechat/server/blob/testing/lib/models/Deal/context.js) You can find a list of all
context items and their types.

### Get a deal [GET /deal/:id]
<!-- include(tests/deal/get.md) -->

### Get deals created by a user [GET /deals]
<!-- include(tests/deal/getAll.md) -->

### Get all deals belonging to a brand [GET /brands/:brand/delals]
<!-- include(tests/deal/getBrandDeals.md) -->

### Get all deals that need backoffice review [GET /brands/:brand/delals/inbox]
<!-- include(tests/deal/getBrandInbox.md) -->

### Create a deal with a listing [POST /deal]
<!-- include(tests/deal/create.md) -->

### Create a hippocket deal [POST /deal]
<!-- include(tests/deal/createHippocket.md) -->

### Delete a deal [DELETE /deals/:id]
<!-- include(tests/deal/remove.md) -->

### Add a role [POST /deal/:id/roles]
<!-- include(tests/deal/addRole.md) -->

### Set listing for a deal [PATCH /deals/:id/listing]
<!-- include(tests/deal/patchListing.md) -->

### Add Context to a deal [POST /deals/:id/context]
<!-- include(tests/deal/addContext.md) -->

### Set approval status for a context [PATCH /deals/:id/context/:cid/approved]
<!-- include(tests/deal/approveContext.md) -->

### Add roles to a deal [POST /deals/:id/roles]
<!-- include(tests/deal/addRole.md) -->

### Delete a role [DELETE /deals/:id/roles/:rid]
<!-- include(tests/deal/removeRole.md) -->

### Add new checklist [POST /deals/:id/checklists]
<!-- include(tests/deal/addChecklist.md) -->

### Offer a new checklist [POST /deals/:id/checklists/offer]
<!-- include(tests/deal/offerChecklist.md) -->

### Update a checklist [PUT /deals/:id/checklists/:cid]
<!-- include(tests/deal/updateChecklist.md) -->

### Get a single task [GET /tasks/:id]
<!-- include(tests/deal/getTask.md) -->

### Add a task [POST /deals/:id/tasks]
<!-- include(tests/deal/addTask.md) -->

### Set form on a task [PUT /tasks/:task/submission]
<!-- include(tests/deal/setSubmission.md) -->

### Get a form revision of a task [GET /tasks/:task/submission/:revision]
<!-- include(tests/deal/getRevision.md) -->

### Set review on a task [PUT /tasks/:task/review]
<!-- include(tests/deal/setReview.md) -->

### Set attention status on a task [PATCH /tasks/:task/needs_attention]
<!-- include(tests/deal/patchAttention.md) -->

### Update a task [PATCH /tasks/:task]
<!-- include(tests/deal/updateTask.md) -->

### Update a bunch of tasks [PUT /deals/:id/tasks]
<!-- include(tests/deal/updateTasks.md) -->

### Record activity on timeline of a task [POST /tasks/:task/timeline]
<!-- include(tests/deal/addActivity.md) -->

### Delete a task [DELETE /tasks/:task]
<!-- include(tests/deal/removeTask.md) --