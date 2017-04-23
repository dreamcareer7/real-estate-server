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
All the contexts are considered to be optional.
:::

Here is a list of contexts we use:

Name                  | Comes from MLS? | Comes from DCAD? | Used in forms       | Used in UI
--------------------- | :-------------: | :--------------: | :-----------------: | :---------:
deal_type             |                 |                  |                     |      RW
list_price            |       ✓         |                  |        ✓            |      R
list_date             |       ✓         |                  |        ✓            |      R
expiration_date       |       ☐         |                  |        ✓            |      R
closing_date          |                 |                  |        ✓            |      R
full_address          |       ✓         |                  |        ✓            |      RW
legal_description     |                 |        ✓         |        ✓            |
unit_number           |       ✓         |                  |        ✓            |
building_number       |                 |                  |        ✓            |
project_name          |                 |                  |        ✓            |
lot_number            |       ✓         |                  |        ✓            |
block_number          |                 |                  |        ✓            |
subdivision           |       ✓         |                  |        ✓            |
street_number         |       ✓         |                  |        ✓            |
street_dir_prefix     |       ✓         |                  |        ✓            |
street_name           |       ✓         |                  |        ✓            |
street_suffix         |       ✓         |                  |        ✓            |
street_address        |       ✓         |                  |        ✓            |      R
city                  |       ✓         |                  |        ✓            |
state                 |       ✓         |                  |        ✓            |      R
state_code            |       ✓         |                  |                     |
postal_code           |       ✓         |                  |        ✓            |
county                |       ✓         |                  |        ✓            |
property_type         |       ✓         |                  |        ✓            |
year_built            |       ✓         |                  |        ✓            |
seller_name           |                 |                  |                     |
buyer_name            |                 |                  |                     |
listing_status        |       ✓         |                  |        ✓            |      RW
transaction_type      |       ✓         |                  |                     |
mls_number            |       ✓         |                  |                     |
mls_area_major        |       ✓         |                  |        ✓            |
mls_area_minor        |       ✓         |                  |        ✓            |
photo                 |       ✓         |                  |                     |

contexts are stored in `deal.context` object.
For example, `street_name` of a deal can be fetched from `deal.context.street_name`.

#### Proposed values

Many of the contexts of a deal can be fetched from alternative data sources. When Rechat manages to find
relevant information to a context, it stores that information as a _Proposed Value_.

For example if your deal is connected to an MLS listing, `deal.proposed_values.street_address` will be populated automatically.
Therefore, whenever you try to show information of a context, you should look into both `deal.context` and `deal.proposed_values`.

```javascript
let street_address = null

if (deal.context && deal.context.street_address)
  street_address = deal.context.street_address
else if (deal.proposed_values && deal.proposed_values.street_address)
  street_address = deal.proposed_values.street_address
```


A deal may also hold the following entities:

* Forms filled by users
* Envelopes which have been sent out to be signed
* Documents uploaded by users


### Create a deal with a listing [POST /deal]
<!-- include(tests/deal/create.md) -->

### Create a hippocket deal [POST /deal]
<!-- include(tests/deal/createHippocket.md) -->

### Get a deal [GET /deal/:id]
<!-- include(tests/deal/get.md) -->

### Get user's deals [GET /deals]
<!-- include(tests/deal/getAll.md) -->

### Attach a file [POST /deals/:id/files]

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

#Group Envelope

## Overview

All the above helps us to generate a PDF File. But the PDF files are legal documents. And therefore, must be signed.
Rechat helps brokers to collect necessary signatures for a generated PDF File.

In order to do this, Rechat connects to a third party service called [Docusign](https://docusign.com).

Docusign is a well-known service that allows anyone to collect signatures for legal documents.
Most brokers already have Docusign accounts.

Therefore, in order for Rechat to be able to do anything in this section,
the user would have to authenticate with his Docusign credentials.

An _Envelope_ is a collection of PDF Files which have been sent to be signed.

So an envelope has the following attributes:

* `title` (String) The title of the envelope which will appear in recipients' email subject
* `status` (Enum) Which can be: `Sent`,`Delivered`,`Completed`,`Declined`,`Voided`
* `recipients` (Array) An array of `EnvelopeRecipient`, each one including information about a recipient and his signature
* `documents` (Array) An array of `EnvelopeDocument`, each one including information about a document that we've tried to collect signatures fo

### Authentication

::: notice
Any of the endpoints in below *might* return `HTTP 412`. That would mean we do not have authentication for this user
on Docusign or the Tokens we have for this user have been expired.

As a result of this, the authentication process described below must be restarted. If successful, the origin action must be tried again.
:::

The process of authenticating a user is as follows:

1. User's browser will be opened to `/users/self/docusign/auth`
2. User's browser will be redirected to Docusign
3. User logs in and authorizes Rechat
4. User's browser will be redirected back to Rechat
5. Control is given back to client (either using Browser's `postMessage` mechanism or redirecting him to `rechat://` on phones)
6. Client tries again the initial action

### Create a new Envelope without authentication [POST /envelopes]

In this example user has no Docusign authentication. Therefore will receicve a `412` error.

<!-- include(tests/envelope/create412.md) -->

### Start authentication [GET /users/self/docusign/auth]

<!-- include(tests/envelope/authenticate.md) -->

### Create Envelope [POST /envelopes]

<!-- include(tests/envelope/create.md) -->

### Get Envelope [GET /envelopes/:id]

<!-- include(tests/envelope/get.md) -->

### Get Envelopes of a deal [GET /deals/:deal/envelopes]

<!-- include(tests/envelope/getDealEnvelopes.md) -->

### Get a PDF file that includes all documents [GET /envelopes/:id.pdf]

<!-- include(tests/envelope/getPdf.md) -->

### Get a PDF file of a document [GET /envelopes/:id/:doc.pdf]

`doc` (integer) `envelope_document.document_id` of the document

<!-- include(tests/envelope/getDocumentPdf.md) -->

### Sign an Envelope [GET /envelopes/:id:/sign]

If the current user is among `envelope.recipients`, it means he should be able to sign it as well.

The process of signing is as follows:

1. User's browser will be opened to `/envelopes/:id/sign`
2. User's browser will be redirected to a page on Docusign where he can sign the document
3. User's browser will be sent back to Rechat
4. Rechat updates the Envelope information
5. Control is given back to client (either using Browser's `postMessage` mechanism or redirecting him to `rechat://` on phones)
6. Client updates the envelope information

### Void an Envelope [PATCH /envelopes/:id:/status]

If for any reason (for example presence of an error in the legal documents) the agent decides that
the envelope must not be legally binded, he can _Void_ (Cancel) it.

If any of the recipients Voids the contract, that means he refuses to sign it.
The envelope in question and all of its documents will not be legally binded and nobody can sign it anymore.

<!-- include(tests/envelope/voidit.md) -->
