# Group Listing

## Overview
A listing contains information about a property and its current sale.

Please note that in a `listing` object, you will only be able to find
meta information about the current sale of the property (like price).

However, each `listing` object has a `property` object inside.
`listing.property` contains all the information about the property like its area and number of rooms.

::: warning
  We do not have endpoints to add listings or properties to the database.
  They are introduced to the system from other sources (Mainly MLS) and client applications
  are only supposed to read them.

  So please do no look for methods to add new listings.
:::

### Get by MUI [GET /listings/search]
<!-- include(tests/listing/by_mui.md) -->

### Get by MLS Number [GET /listings/search]
<!-- include(tests/listing/by_mls.md) -->

### Find Listings by query [GET /listings/search{?q,status}]
`q` (string) The query like _Dallas_

`status`A list of wanted statuses, separated by comma, like _Leased,Sold_

<!-- include(tests/listing/by_query.md) -->


### Get by ID [GET /listings/{id}]
<!-- include(tests/listing/getListing.md) -->