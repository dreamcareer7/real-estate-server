#Group Review

## Overview

Uploaded files and Signed documents within a deal could be submitted for review by brokerage.

Each `review` model is the review status of 1 document.
Therefore, in order to review 5 documents, you would need to save 5 review models.

Submitted reviews will show up in the deal object as `deal.reviews`

Each review has:

* `review.file`              (uuid)   (Optional) File which is about to be reviewed.
                                                 Corresponds to items in `deal.files`.
* `review.envelope_document` (uuid)   (Optional) Signed document which is about to be reviewed.
                                                 Corresponds to items in `envelope.documents`.
* `review.state`             (enum)   (Required) `Pending`, `Rejected`, `Approved`
* `review.comment`           (string) (Optional) Latest comment

### Submit a review request [POST /deals/:deal/reviews]
<!-- include(tests/review/create.md) -->

### Submit a bunch of review requests [POST /deals/:deal/reviews/bulk]
<!-- include(tests/review/bulk.md) -->

### Update a review [PUT /reviews/:id]
<!-- include(tests/review/update.md) -->

### A deal with reviews [GET /deals/:id]

This is an example deal after it has reviews submitted to it.
The reviews are stored in `deal.reviews` which is an array of review models.

<!-- include(tests/review/getDeal.md) -->
