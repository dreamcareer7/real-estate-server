# Group Contacts

## Overview
A _Contact_ is an object, belonging to a user which holds various information about another person, ranging
from phone numbers and email to birthdays and company information. A contact is a personal object, meaning
each user has a set of them individually.

### Contact attributes
Name                  | Type            | Deep Validation | Description
--------------------- | :-------------: | :--------------:| :----------:
email                 |    string       |       ✓         | Holds an email address
phone_number          |    string       |       ✓         | Holds a phone number
name                  |    string       |                 | First name and last name
birthday              |    date         |                 | A date for a birthday
tag                   |    string       |                 | A string describing a contact category
profile_image_url     |    url          |       ✓         | A url pointing to profile image of this contact
cover_image_url       |    url          |       ✓         | A url pointing to cover image of this contact
company               |    string       |                 | A string indicating a company name
stage                 |    string       |       ✓         | Stage of this contact
address               |    address      |                 | An address for this contact
source_type           |    string       |       ✓         | Source type of this contact
note                  |    string       |                 | A small note for this contact

### Get all user contacts [GET /contacts]
<!-- include(tests/contact/getContacts.md) -->

### Search contacts [GET /contacts/search]
<!-- include(tests/contact/search.md) -->

### Create a new contact [POST /contacts]
<!-- include(tests/contact/create.md) -->

### Add attributes to a contact [POST /contacts/:id/attributes]
<!-- include(tests/contact/addAttributes.md) -->

### Deleting an attribute [DELETE /contacts/:id/attributes/:id]
<!-- include(tests/contact/removeAttribute.md) -->

### Deleting a contact [DELETE /contacts/:id]
<!-- include(tests/contact/deleteContact.md) -->
