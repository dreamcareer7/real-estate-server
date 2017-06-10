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

::: warning
Any of the endpoints in below *might* return `HTTP 412`. That would mean we do not have authentication for this user
on Docusign or the Tokens we have for this user have been expired.

As a result of this, the authentication process described below must be restarted. If successful, the original action must be tried again.
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

### Create Envelope [POST /envelopes]

<!-- include(tests/envelope/create.md) -->

### Get Envelope [GET /envelopes/:id]

<!-- include(tests/envelope/get.md) -->

### Get Envelopes of a deal [GET /deals/:deal/envelopes]

<!-- include(tests/envelope/getDealEnvelopes.md) -->

### Get a PDF file that includes all documents [GET /envelopes/:id.pdf]

<!-- include(tests/envelope/getPdf.md) -->

### Get a PDF file of a document [GET /envelopes/:id/:doc.pdf]

`id` (uuid) id of the envelope
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
