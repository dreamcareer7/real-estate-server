Basically, login in rechat (and other oauth2 based API's) means fetching `access_token` from the server
and providing it in the HTTP headers for the remainder of the session like this:

```http
  Authorization: Bearer <fetched_access_token>
```

Additional to `access_token`, this endpoint will give you profile of the logged in user.