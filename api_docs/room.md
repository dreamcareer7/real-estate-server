# Group Room

## Overview
A Room is basically a place where any number of rechat users (> 1) could chat.

Although the Room is basically a chat room, some other objects could be attached to it.
Other concepts of Rechat like Alerts and recommendations are heavily linked to rooms.

::: warning
  It is important to remember that even a private discussion between two people happens on a chat room.

  And unlike many services like Facebook, Hangouts, you can have more than one chat room with a single person.
:::

### Get a user's Rooms [GET /rooms]
<!-- include(tests/room/getUserRooms.md) -->

### Create Room [POST /rooms]
<!-- include(tests/room/create.md) -->

### Get Room [GET /rooms/{id}]
<!-- include(tests/room/getRoom.md) -->

### Delete Room [DELETE /rooms/{id}]
<!-- include(tests/room/deleteRoom.md) -->

### Get Room Media [GET /rooms/{id}/media]
<!-- include(tests/room/getRoomMedia.md) -->

### Search by User [GET /rooms/search{?users}]
Searches room by user id's
<!-- include(tests/room/searchByUser.md) -->

### Search by Query [GET /rooms/search{?q}]
Search room for user names, phone numbers, emails, room title and more
<!-- include(tests/room/searchByTitle.md) -->

### Add Users to a room [POST /rooms/{id}/users]
You can add multiple users to a room in the same call
<!-- include(tests/room/addUser.md) -->

### Remove user from a room [DELETE /rooms/{rid}/users/{id}]
<!-- include(tests/room/removeUser.md) -->