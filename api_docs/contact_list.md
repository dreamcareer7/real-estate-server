# Group Contact List

## Contact search list
A _Contact search list_ represents a saved search performed on contacts. User can save this list to access the contacts that match criteria later. Each search list is composed of four properties: _attribute def_, which is id for attribute definition on contact, this is the property that serach will be applied against; _operator_ that can be one of 'eq' which stands for equality, 'gte' for greather than or equal, 'lte' for less than or equal, 'like' to perform a simple string search, 'any' to test if any of values matches contact attribute, 'all' to test if all values match contact attribute. Finally _value_ is the actual value(s) that should be used in performing the search

### Create a contact search list [POST /contact-search-lists]
<!-- include(tests/contact_list/create.md) -->

### Update a contact search list [PUT /contact-search-lists/:id]
<!-- include(tests/contact_list/update.md) -->

### List all contact search list for current user [GET /contact-search-lists]
<!-- include(tests/contact_list/listForUser.md) -->

### Delete contact search list [DELETE /contact-search-lists/:id]
<!-- include(tests/contact_list/deleteIt.md) -->

### List all available contact search filters that can be appiled to contacts [GET /contact-search-lists/options]
<!-- include(tests/contact_list/listAllFilters.md) -->
