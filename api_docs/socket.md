# Group Websockets

Some of the functionality of the API is also exposed using Websockets to allow real time communication with the clients.

## Incoming events

Description                                           | Event Name        | Argument 1                           | Argument 2       | Notes
----------------------------------------------------- | ----------------- | ------------------------------------ | ---------------- | --------
User started typing a message                         | User.Typing       | `user_id`                            | `room_id`        |
User stopped typing a message                         | User.TypingEnded  | `user_id`                            | `room_id`        |
A message is sent to the room                         | Message.Sent      | Room object                          | `message object` |
List of online users                                  | Users.States      | Array of `{user_id, state}`          |                  | This event is sent only once after you authenticate your socket
A User has come online                                | User.State        | `user_id`                            |                  | You will receive N events for each user where N is the number of shared rooms you have with this user
A Notification has arrived                            | Notification      | Notification object                  |                  | If you are online using websockets, you will not receive push notifications. Instead you will get the notification event on websockets.
A user has joined the room                            | Room.UserJoined   | User object                          |                  |
A user has acknowledged all notifications in the room | Room.Acknowledged | Room id                              |                  |

`state` in the above refers to user statuses which could be `Online`, `Offline` or `Background`.

## Actions

Description                              | Event Name       | Argument 1                           | Argument 2
---------------------------------------- | ---------------- | ------------------------------------ | --------------
Authenticate                             | Authenticate     | access_token
Let others know that user started typing | User.Typing      | room_id
Let others know that user stopped typing | User.TypingEnded | room_id
Send a message to a room                 | Message.Send     | room_id                              | message object
Acknowledge all notifications in a room  | Room.Acknowledge | room_id                              |