#Group Website

## Overview
Website endpoints are responsible for manipulating the data for our website builder.

### Create a website [POST /websites]
<!-- include(tests/website/create.md) -->

### Get a website [GET /websites/:id]
<!-- include(tests/website/get.md) -->

### Update a website [PUT /websites/:id]
<!-- include(tests/website/update.md) -->

### Get all user's websites [GET /websites]
<!-- include(tests/website/getAll.md) -->

### Add hostname to a website [POST /websites/:id/hostnames]
<!-- include(tests/website/addHostname.md) -->

### Find a website by its hostname [GET /websites/search?hostname=:hostname]
<!-- include(tests/website/getByHostname.md) -->

### Delete hostname from a website [DELETE /websites/hostnames?hostname=:hostname]
<!-- include(tests/website/deleteHostname.md) -->