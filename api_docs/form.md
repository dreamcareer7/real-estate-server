#Group Forms

## Overview

Real Estate Agents and brokerages have tons of paperwork. However, most of these papers must be filled in PDF forms.

PDF forms are have a very poor experience and unusable on phones. Also, they are dumb and a lot of redundant data has to be filled in them throughout a deal.

Therefore, Rechat offers a form feature which is the core of our transaction platform.

The basic idea behind the feature is as follows:

1. We will create an HTML form for any of the PDF Documents that brokers have to use
2. We will map the HTML form to the PDF Document
3. Users will fill the HTML form. We, using the mapped data, will generate PDF's for them

:::note
  In order to be able to create HTML forms easily, we use a form builder tool called [FormStack](https://formstack.com).
  However, FormStack is abstracted away from clients and is considered as an implementation detail.
:::


### Form

A _Form_ is an entity that represents one of the forms that brokers _can_ fill.

It has two public properties:

1) `name (String)` Name of the form. Like `A Buyer's termination of a contract`
2) `roles (Array)` List of the roles that can participate (sign) in completion of this form.
  (Will elaborate on this on Envelopes section)

::: notice
A form object has also the connection to the relevant Formstack form and the mapping data. However, that's irrelevant to clients.
:::

::: note
Forms are _not_ created or updated by users. Users can only get a _copy_ of this form, which we call a _submission_.

Basically, a _Form_ is the original copy which is only created and maintained by Rechat.
:::

::: warning
The only endpoint clients have to use is to get the list of forms.
The rest of the API endpoints documented here are used by our internal mapper tool.
:::

### Get all available forms [GET /forms]
<!-- include(tests/form/getAll.md) -->

### Create a new form [POST /forms]
<!-- include(tests/form/create.md) -->

### Get a form [GET /forms/:id]
<!-- include(tests/form/get.md) -->

### Update a form [PUT /forms/:id]
<!-- include(tests/form/getAll.md) -->

### Get a form by Formstack ID [GET /forms/search?formstack_id]

`formstack_id` (integer) Formstack ID

<!-- include(tests/form/getByFSId.md) -->


#Group Submission

## Overview

When a user gets a new copy of one of the Forms, we call that copy a _Submission_.

Therefore, if there are 15 legal documents supported in Rechat, that means we will have 15 forms.

However, _anytime_ a user uses one of these forms, we will create a new copy for him, which we internally call a _submission_.

A submission include information such as:

* `state` of the submission. (Could be either `Draft` or `Fair`)
* `author` who amended it the last time
* `title` of the submission (which is a copy of the title of its original form)
* `revision_count` The number of revisions we have for this submission which is `number of edits + 1` (As the first time its created its also a revision)
* `file` which is an object that holds information about the PDF file generated for the latest revision of this submission

We keep track of all the changes a user makes to a single submission.
Therefore, if the user edits his submission 10 times, we will save and keep all 11 different revisions of that submission.

### Submit a submission [POST /deals/:deal/submissions]

`deal` The uuid of the deal this submission should be saved in

<!-- include(tests/submission/create.md) -->

### Get all submissions of a deal [GET /deals/:deal/submissions]

``deal` The uuid of the deal

<!-- include(tests/submission/getAll.md) -->

### Update a submission [PUT /forms/submissions/:id]

`id` The uuid of the submission that must be updated

<!-- include(tests/submission/update.md) -->

### Delete a submission [DELETE /forms/submissions/:id]

`id` The uuid of the submission that must be updated

<!-- include(tests/submission/remove.md) -->

### Delete a submission [DELETE /forms/submissions/:id]

`id` The uuid of the submission that must be updated

<!-- include(tests/submission/remove.md) -->