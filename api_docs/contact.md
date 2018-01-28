# Group Contacts

## Overview
A _Contact_ is an object, belonging to a user which holds various information about another person, ranging
from phone numbers and email to birthdays and company information. A contact is a personal object, meaning
each user has a set of them individually.

### Contact attributes
A _ContactAttribute_ is an object that holds all the data and meta-data about a contact attribute.

Field       | Type      | Description
------------|:---------:|-------------------------------------------------
type        | string    | See "Attribute types" table below
label       | string    | Label for attributes like email and phone number
is_primary  | boolean   | Marks an attribute as primary. Used in certain cases

**Note:** Only one instance of an attribute type can be marked as primary at any given time. When an attribute is marked as primary, all other attributes of that type are unmarked automatically.

#### Attribute types

Name                  | Type                | Deep Validation | Description
--------------------- | :-----------------: | :--------------:| ----------
email                 |    string           |       ✓         | Holds an email address
phone_number          |    string           |       ✓         | Holds a phone number
name                  |    NameAttribute    |                 | Name and legal name details
birthday              |    date             |                 | A date for a birthday
tag                   |    string           |                 | A string describing a contact category
profile_image_url     |    url              |       ✓         | A url pointing to profile image of this contact
cover_image_url       |    url              |       ✓         | A url pointing to cover image of this contact
company               |    string           |                 | A string indicating a company name
stage                 |    string           |       ✓         | Stage of this contact
website               |    string           |                 | Any url related to the contact
job_title             |    string           |                 | Contact's job title/position in company
address               |    AddressAttribute |                 | An address for this contact
source_type           |    string           |       ✓         | Source type of this contact
note                  |    string           |                 | A small note for this contact
relation              |  RelationAttribute  |                 | Marks relation between this contact and another

#### NameAttribute object

Fields              | Type      |
--------------------|:---------:|
title               | string    |
first_name          | string    |
middle_name         | string    |
last_name           | string    |
nickname            | string    |
legal_prefix        | string    |
legal_first_name    | string    |
legal_middle_name   | string    |
legal_last_name     | string    |

#### AddressAttribute object

Fields              | Type   |
--------------------|:------:|
street_name         | string |
city                | string |
state               | string |
country             | string |
postal_code         | string |

#### RelationAttribute object

Fields   | Type   |
---------|:------:|
relation | string |
contact  | uuid   |

### Get all user contacts [GET /contacts]
<!-- include(tests/contact/getContacts.md) -->

### Search contacts [GET /contacts/search]
<!-- include(tests/contact/search.md) -->

### Create a new contact [POST /contacts]
<!-- include(tests/contact/create.md) -->

### Add attributes to a contact [POST /contacts/:id/attributes]
<!-- include(tests/contact/addAttribute.md) -->

### Deleting an attribute [DELETE /contacts/:id/attributes/:id]
<!-- include(tests/contact/removeAttribute.md) -->

### Deleting a contact [DELETE /contacts/:id]
<!-- include(tests/contact/deleteContact.md) -->

### Get all tags [GET /contacts/tags]
<!-- include(tests/contact/getAllTags.md) -->

### Update a contact [PATCH /contacts/:id]
<!-- include(tests/contact/updateContact.md) -->

## Timeline Activities
An _Activity_ is an object, recording an event that either a specific user has done or a user has done on a specific contact of theirs. There are generally two types of activities. *User* activities and *Contact* activities.

### Get all activities [GET /contacts/:id/timeline]
<!-- include(tests/contact/getTimeline.md) -->

### Record activity Contact [POST /contacts/:id/timeline]

#### By Reference
<!-- include(tests/contact/addActivityReference.md) -->

#### By Object
<!-- include(tests/contact/addActivityObject.md) -->

### Record activity User [POST /users/self/timeline]

#### By Reference
<!-- include(tests/contact/addActivityReferenceForUser.md) -->

#### By Object
<!-- include(tests/contact/addActivityObjectForUser.md) -->
