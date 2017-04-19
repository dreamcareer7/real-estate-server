# Schools

## Overview
When a user searches for homes, we provide a specific filter that
allows user to filter out the results by schools that his child can register.

### Get by query [GET /schools/search{?q}]
`q` (string) The query like _Wylie_

<!-- include(tests/school/searchWithValidQuery.md) -->

### Get by districts [GET /schools/search{?districts[]}]
`districts[]` (string) The query like _Alabama_

<!-- include(tests/school/searchByDistricts.md) -->

### Get districts [GET /schools/districts/search{?q[]}]
`q[]` (string) The query like _aa_

<!-- include(tests/school/searchDistricts.md) -->
