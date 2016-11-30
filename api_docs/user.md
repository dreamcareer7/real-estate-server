# Group Users

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

### Find by email [GET /users/related/search]
<!-- include(tests/user/searchByEmail.md) -->

### Find by phone [GET /users/related/search]
<!-- include(tests/user/searchByPhone.md) -->

### Create Phone Verification [POST /phone_verifications]
<!-- include(tests/verification/createPhoneVerification.md) -->

### Create Email Verification [POST /email_verifications]
<!-- include(tests/verification/createEmailVerification.md) -->