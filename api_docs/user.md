# Group Users

## User types

There are 2 types of users in Rechat. _Agent_ and _Client_.
An _Agent_ is a licensed Real Estate Broker who uses Rechat to utilize his workflow.

A client is someone looking for a Real Estate transaction.

There are features built in Rechat to enhance both types of clients use cases.

## Shadow Users

Rechat is an open platform. That means we do not want our agents to _enforce_ their clients to install Rechat.
That means a Rechat user (mostly clients) should be able to communicate using email or phones.

This means when an agent invites a client using her email address or phone number, we actually
create a user object in our database for the client. This way we can track her communication.

Therefore a _Shadow User_ is a user who has been invited to Rechat but has not completed her sign up yet.

::: note
It is important to remember that shadow users _can_ use some of the Rechat's features using Email/Phone.
:::

### Create User [POST /users]
<!-- include(tests/user/create.md) -->

### Get User [GET /users/{id}]
<!-- include(tests/user/getUser.md) -->

### Update User [PUT /users/{id}]
<!-- include(tests/user/update.md) -->

### Delete User [DELETE /users/{id}]
<!-- include(tests/user/deleteUser.md) -->

### Change Password [PATCH /users/self/password]
<!-- include(tests/user/changePassword.md) -->

### Reset Password [POST /users/reset_password]
<!-- include(tests/user/resetPassword.md) -->

### Set Timezone [PATCH /users/self/timezone]
<!-- include(tests/user/patchUserTimeZone.md) -->

### Set Address [PUT /users/self/address]
<!-- include(tests/user/setAddress.md) -->

### Unset Address [DELETE /users/self/address]
<!-- include(tests/user/deleteAddress.md) -->

### Create Phone Verification [POST /phone_verifications]
<!-- include(tests/verification/createPhoneVerification.md) -->

### Create Email Verification [POST /email_verifications]
<!-- include(tests/verification/createEmailVerification.md) -->