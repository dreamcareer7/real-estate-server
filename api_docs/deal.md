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

### Get a list of all possible context [GET /deal/contexts]

Gives you a list of all usable context items.
Each context item has:

* `data_type` `(Required)` `Date|Number|String`
* `name`      `(Required)`  Name of the data type (eg _list_date_) (Used internally)
* `label`                   Label to show to users (eg _List Starting Date_)
* `required`                A Bit flag set representing the cases in which this item is required
* `optional`                A Bit flag set representing the cases in which this item is asked but not required
* `show_on_fact_sheet`      A Bit flag set representing the cases in which this context is shown on fact sheet
* `section`                 Which section of fact sheet this should appear on `CriticalDates|Listing|CDA`

Items based on bit flags use the following constants to determine whether they should show up:

Condition                              | Bit
---------------------------------------|-----
`deal_type === 'Selling'`              | `1`
`deal_type === 'Buying'`               | `2`
`property_type === 'Resale'`           | `128`
`property_type === 'NewHome'`          | `256`
`property_type === 'Lot'`              | `512`
`property_type === 'CommercialSale'`   | `1024`
`property_type === 'ResidentialLease'` | `2048`
`property_type === 'CommercialLease'`  | `4096`

<!-- include(tests/deal/getContexts.md) -->

### Get a deal [GET /deal/:id]
<!-- include(tests/deal/get.md) -->

### Get deals created by a user [GET /deals]
<!-- include(tests/deal/getAll.md) -->

### Get all deals belonging to a brand [GET /brands/:brand/deals]
<!-- include(tests/deal/getBrandDeals.md) -->

### Get all deals that need backoffice review [GET /brands/:brand/deals/inbox]
<!-- include(tests/deal/getBrandInbox.md) -->

### Search through all deals [POST /deals/filter]
<!-- include(tests/deal/filter.md) -->

### Create a deal with a listing [POST /deal]
<!-- include(tests/deal/create.md) -->

### Create a hippocket deal [POST /deal]
<!-- include(tests/deal/createHippocket.md) -->

### Delete a deal [DELETE /deals/:id]
<!-- include(tests/deal/remove.md) -->

### Add a bunch of roles [POST /deal/:id/roles]
<!-- include(tests/deal/addRole.md) -->

### Update a role [PUT /deal/:id/roles/:rid]
<!-- include(tests/deal/updateRole.md) -->

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
<!-- include(tests/deal/removeTask.md) -->