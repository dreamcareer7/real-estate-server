# Group Contacts

## Overview
A _Contact_ is an object, belonging to a user which holds various information about another person, ranging from phone numbers and email to birthdays and company information. A contact is a personal object, meaning each user has a set of them individually.

### Contact
A _Contact_ is a simple and small object that contains an actual _Attributes_.

Field                   | Type         | Description
------------------------|:------------:|------------------------------------------------------------------------
id                      | uuid         | Id of the parent contact
user                    | User         | Owner of the contact. association: `contact.user`
created_by              | User         | User who created this contact
updated_by              | User         | User who created this contact
brand                   | Brand        | **Unused** Owner of the contact, if it's a brand.
created_at              | number       |
updated_at              | number       |
deleted_at              | number       |
ios_address_book_id     | string | Address book id of this contact on iOS device
android_address_book_id | string | Address book id of this contact on Android device

Contact's available model associations are as follows:

*  `contact.summary`
*  `contact.lists`
*  `contact.users`
*  `contact.deals`
*  `contact.brand`
*  `contact.user`
*  `contact.created_by`
*  `contact.updated_by`

### Contact attributes
A _ContactAttribute_ is an object that holds all the data and meta-data about a contact attribute.

Field          | Type    | Description
---------------|:-------:|----------------------------------------------------------------------------
attribute_def  | uuid    | _AttributeDef_ id
label          | string  | Label for attributes like email and phone number
is_primary     | boolean | Marks an attribute as primary. Used in certain cases
text           | string  | If the attribute is string, send data here
index          | number  | An integer, used for grouping related attributes together, mainly the address components; so when a `city` and a `street_name` attribute have the same index, they belong to the same address group. This grouping is preserved when contacts are merged.
number         | number  | If the attribute is number, send data here
date           | number  | If the attribute is date, send the unix timestamp here
attribute_type | string  | **Response only** for global attributes, this is the name of attribute type
contact        | uuid    | **Response only** Id of the attribute's contact
created_by     | uuid    | **Response only** User id who created the attribute
created_at     | number  | **Response only**
updated_at     | number  | **Response only**
deleted_at     | number  | **Response only**

**Note:** Only one instance of any attribute type can be marked as primary at any given time. When an attribute is marked as primary, all other attributes of that type are unmarked automatically.


### Get all user contacts [GET /contacts]
<!-- include(tests/contact/getContacts.md) -->

### Create a new contact [POST /contacts]
<!-- include(tests/contact/create.md) -->

### Update multiple contacts [PATCH /contacts]
Updates multiple contacts and their attributes. If attributes have `id`, they are updated; otherwise, they will be added as new attributes.

<!-- include(tests/contact/updateManyContacts.md) -->

### Delete multiple contacts [DELETE /contacts]
<!-- include(tests/contact/deleteManyContacts.md) -->

### Search in contacts by query term [POST /contacts/filter]
<!-- include(tests/contact/stringSearch.md) -->

### Filter contacts by attributes [POST /contacts/filter]
<!-- include(tests/contact/filterContacts.md) -->

### Filter contacts by multiple tags [POST /contacts/filter]
<!-- include(tests/contact/filterContactsHavingTwoTags.md) -->

### Filter contacts not having attributes [POST /contacts/filter]
<!-- include(tests/contact/invertedFilter.md) -->

### Get all tags [GET /contacts/tags]
<!-- include(tests/contact/getAllTags.md) -->

### Get a contact [GET /contacts/:id]
<!-- include(tests/contact/getSingleContact.md) -->

### Update a contact [PATCH /contacts/:id]
Updates a single contact and its attributes. If attributes have `id`, they are updated; otherwise, they will be added as new attributes.

<!-- include(tests/contact/updateContact.md) -->

### Deleting a contact [DELETE /contacts/:id]
<!-- include(tests/contact/deleteContact.md) -->

### Add attributes to a contact [POST /contacts/:id/attributes]
<!-- include(tests/contact/addAttribute.md) -->

### Deleting an attribute [DELETE /contacts/:id/attributes/:attribute_id]
<!-- include(tests/contact/removeAttribute.md) -->

### Upload a file for contacts [POST /contacts/upload]
<!-- include(tests/contact_import/uploadCSV.md) -->

### Import contacts with JSON data [POST /contacts/import.json]
<!-- include(tests/contact/importManyContacts.md) -->

### Import contacts from CSV [POST /contacts/import.csv]
<!-- include(tests/contact_import/importCSV.md) -->

### Get all of the duplicate clusters [GET /contacts/:id/duplicates]
<!-- include(tests/contact/getContactDuplicates.md) -->

### Get the duplicate cluster for a contact [GET /contacts/:id/duplicates]
<!-- include(tests/contact/getDuplicateClusters.md) -->

### Merge contacts [POST /contacts/:id/merge]
<!-- include(tests/contact/mergeContacts.md) -->

### Merge multiple clusters of duplicate contacts [POST /contacts/merge]
<!-- include(tests/contact/bulkMerge.md) -->

### Get status of a contact related background job [GET /contacts/jobs/:job_id]
<!-- include(tests/contact/getJobStatus.md) -->

## Timeline Activities

An _Activity_ is an object, recording an event that either a specific user has done or a user has done on a specific contact of theirs. There are generally two types of activities. *User* activities and *Contact* activities.

### Get all activities [GET /contacts/:id/timeline]
<!-- include(tests/contact/getTimeline.md) -->

# Group Attribute Definitions

## Overview
A _ContactAttributeDef_ is an object defining every aspect of an attribute type. There a number of system defined attribute definitions, and users can create their own user-defined attribute types. System defined definitions are marked as `global`. Non-global attributes are commonly referred to as _Custom Attributes_.

Field       | Type     | Description
------------|:--------:|----------------------------------------------------------------------------
name        | string   | A name for the attribute def (e.g. email, phone_number, etc.) Used for global attributes.
data_type   | string   | `text`, `date` or `number`.
label       | string   | The form label for the attribute on clients
section     | string   | The section on which the attribute should be displayed
required    | boolean  | Whether the attribute is mandatory
global      | boolean  | Whether the attribute is a global, system-defined attribute in contrast to user-defined ones.
singular    | boolean  | Whether there can only be one instance of the attribute or multiple attributes of the same type are allowed.
show        | boolean  | Whether the clients must show the attribute or not.
editable    | boolean  | Whether the clients must allow editing the attribute or not.
searchable  | boolean  | Whether the attribute contributes to full-text index of the contact or not. Only for textual attributes
has_label   | boolean  | Whether the clients must display a label UI for the attribute or not.
enum_values | string[] | Whether the clients must display a dropdown for the value of attribute or not.
labels      | string[] | Whether the clients must display a dropdown as label UI component.
brand       | uuid     | The brand that owns the user-defined attribute.
created_by  | uuid     | The original creator of the contact
created_at  | date     | 
updated_at  | date     | 
deleted_at  | date     | 

### Global Attribute types

Name              | Type   | Description
------------------|:------:|---------------------------------------------------
email             | string | Holds an email address
phone_number      | string | Holds a phone number
title             | string | a.k.a prefix
first_name        | string |
middle_name       | string |
last_name         | string |
nickname          | string |
marketing_name    | string | A name used in marketing emails and stuff.
birthday          | date   | A date for a birthday
important_date    | date   | Any kind of annual event, like Wedding Anniversary, First Home, Child Birthday, etc.
tag               | string | A string describing a contact category
source            | string |
profile_image_url | string | A url pointing to profile image of this contact
cover_image_url   | string | A url pointing to cover image of this contact
company           | string | A string indicating a company name
website           | string | Any url related to the contact
job_title         | string | Contact's job title/position in company
street_prefix     | string |
street_name       | string |
street_suffix     | string |
unit_number       | string |
city              | string |
state             | string |
country           | string |
postal_code       | string |
source_type       | string | Source type of this contact. **Non-editable**.
note              | string | A small note for this contact

### SourceType possible values

Values            |
------------------|
BrokerageWidget   |
IOSAddressBook    |
SharesRoom        |
ExplicitlyCreated |
External/Outlook  |
CSV               |

### Get all attribute definitions [GET /contacts/attribute_defs]
<!-- include(tests/contact/getAttributeDefs.md) -->

### Create an attribute definition [POST /contacts/attribute_defs]
<!-- include(tests/contact_attribute_def/create.md) -->

### Delete an attribute definition [DELETE /contacts/attribute_defs/:id]
<!-- include(tests/contact_attribute_def/remove.md) -->
