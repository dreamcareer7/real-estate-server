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

contexts are stored in `deal.deal_context` object.
For example, `street_name` of a deal can be fetched from `deal.deal_context.street_name`.

Contexts are defined by each brand. Please refer to brand documentation to see how you can
get a list of available contexts for each brand.

### Get a deal [GET /deals/:id]
<!-- include(tests/deal/get.md) -->

### Get deals created by a user [GET /deals]
<!-- include(tests/deal/getAll.md) -->

### Get all deals belonging to a brand [GET /brands/:brand/deals]
<!-- include(tests/deal/getBrandDeals.md) -->

### Get all deals that need backoffice review [GET /brands/:brand/deals/inbox]
<!-- include(tests/deal/getBrandInbox.md) -->

### Search through all deals [POST /deals/filter]
<!-- include(tests/deal/filter.md) -->

### Create a deal with a listing [POST /deals]
<!-- include(tests/deal/create.md) -->

### Delete a deal [DELETE /deals/:id]
<!-- include(tests/deal/remove.md) -->

### Add a bunch of roles [POST /deals/:id/roles]
<!-- include(tests/deal/addRole.md) -->

### Update a role [PUT /deals/:id/roles/:rid]
<!-- include(tests/deal/updateRole.md) -->

### Set listing for a deal [PATCH /deals/:id/listing]
<!-- include(tests/deal/patchListing.md) -->

### Change property type of a deal [PATCH /deals/:id/property_type]
<!-- include(tests/deal/patchPropertyType.md) -->

### Add Context to a deal [POST /deals/:id/context]
<!-- include(tests/deal/addContext.md) -->

### Set approval status for a context [PATCH /deals/:id/context/:cid/approved]
<!-- include(tests/deal/approveContext.md) -->

### Get history for a deal context on a deal [GET /deals/:id/context/:cname]
<!-- include(tests/deal/getContextHistory.md) -->

### Add roles to a deal [POST /deals/:id/roles]
<!-- include(tests/deal/addRole.md) -->

### Delete a role [DELETE /deals/:id/roles/:rid]
<!-- include(tests/deal/removeRole.md) -->

### Add new checklist [POST /deals/:id/checklists]
<!-- include(tests/deal/addChecklist.md) -->

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

### Set attention status on a task [PATCH /tasks/:task/attention_requested]
<!-- include(tests/deal/patchAttention.md) -->

### Update a task [PATCH /tasks/:task]
<!-- include(tests/deal/updateTask.md) -->

### Update a bunch of tasks [PUT /deals/:id/tasks]
<!-- include(tests/deal/updateTasks.md) -->

### Record activity on timeline of a task [POST /tasks/:task/timeline]
<!-- include(tests/deal/addActivity.md) -->

### Post message to a task room [POST /tasks/:task/messages]
<!-- include(tests/deal/postMessage.md) -->

### Delete a task [DELETE /tasks/:task]
<!-- include(tests/deal/removeTask.md) -->

### Create gallery item [POST /deals/:id/gallery/items]
<!-- include(tests/deal/createGalleryItem.md) -->

### Update gallery item [PUT /deals/:id/gallery/items/:iid]
<!-- include(tests/deal/updateGalleryItem.md) -->

### Update gallery item's file [PATCH /deals/:id/gallery/items/:iid/file]
<!-- include(tests/deal/updateGalleryItemFile.md) -->

### Delete gallery items (Bulk) [DELETE /deals/:id/gallery/items]
<!-- include(tests/deal/deleteGalleryItems.md) -->

### Sort gallery items [PUT /deals/:id/gallery/items/sort]
<!-- include(tests/deal/sortGalleryItems.md) -->

### Generate a Zip url for deal's gallery [POST /deals/:id/gallery.zip]
<!-- include(tests/deal/createGalleryZipUrl.md) -->

### Download a Zip archive for deal documents [GET /deals/:id.zip]
<!-- include(tests/deal/downloadDealZip.md) -->
