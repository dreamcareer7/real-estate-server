#Group Contact

## Overview
Each user has an address book on Rechat.

This address book differs from her address book on her phone and only consists of rechat users.

### Create [POST /contacts]

Column                     | Description
---------------------------| ---------
match_credentials (Boolean)| Creates this contact only if a user with matching credentials is found

<!-- include(tests/contact/create.md) -->

### Get [GET /contacts/{id}]
<!-- include(tests/contact/getContact.md) -->

### Update [PUT /contacts/{id}]
<!-- include(tests/contact/updateContact.md) -->

### Delete [DELETE /contacts/{id}]
<!-- include(tests/contact/deleteContact.md) -->

### Set Profile Image [PATCH /contacts/{id}/profile_image_url]
<!-- include(tests/contact/patchContactProfileImage.md) -->

### Set Cover Image [PATCH /contacts/{id}/cover_image_url]
<!-- include(tests/contact/patchContactCoverImage.md) -->

### Get by tag [GET /contacts{?tags}]
<!-- include(tests/contact/getByTag.md) -->

### Add Tag [POST /contacts/{id}/tags]
<!-- include(tests/contact/addTag.md) -->

### Remove tag [DELETE /contacts/{id}/tags/{tid}]
<!-- include(tests/contact/removeTag.md) -->

### Search [GET contacts/search{?q}]
<!-- include(tests/contact/getByTag.md) -->