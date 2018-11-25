# Group Template

## Overview
Rechat's Marketing Center and promotional collaterals revolve around the concept of "Templates".
So Templates are the original copies provided by Rechat.

Each time a user saves a template for himself, we call that copy a Template _Instance_.

### Create a template [POST /templates]
::: warning
  This endpoint adds a new template to the system so users can use it.
  If you want to save and endpoint for users and render them, look at instantiation.
:::
<!-- include(tests/template/create.md) -->

### Get all templates [GET /templates{?medium,type}]

`medium` (Array) Applicable mediums

`type `  (Array) Applicable template types

<!-- include(tests/template/getForUser.md) -->

### Save a template [POST /templates]
::: warning
  Use this endpoint to save a user-edited template and get it rendered
:::
<!-- include(tests/template/instantiate.md) -->

### Share [POST /templates/instances/:instance/share]
This endpoints sends a template instance with a text to a selection of recipients
So they can use their mobile phones to share it on social networks
<!-- include(tests/template/share.md) -->

### History [GET /templates/instances]
Returns a collection of instances that my user has saved before
<!-- include(tests/template/getMine.md) -->

