#Group Deal

## Overview

A _Deal_ holds information about a Real Estate Deal/Transaction.

Each deal has the following attributes:

* Side. (If we're `Selling `or `Buying`) (Required)
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
photo                 |       ✓         |                  |        ✓            |

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
