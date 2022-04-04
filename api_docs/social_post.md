# Social Post

## Overview

### Get Social posts of brand [GET /brands/:brand/social-post{?user,executed,start,limit}]

`brand` (uuid) ID of the brand

`user` (uuid) ID of the user (optional)

`executed `  (boolean) true means get the executed posts

`start `  (number)  number of rows to skip before starting to return rows

`limit `  (number) limited number of records
<!-- include(tests/social_post/getUserSocialPosts.md) -->

### Create a social post [POST /brands/:brand/social-post]
<!-- include(tests/social_post/scheduleInstagramPost.md) -->

### Update social post [PUT /brands/:brand/social-post/:socialPostId]
<!-- include(tests/social_post/updateSocialPost.md) -->

### Delete a social post [DELETE /brands/:brand/social-post/:socialPostId]
<!-- include(tests/social_post/deleteSocialPost.md) -->