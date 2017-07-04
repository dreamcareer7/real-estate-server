#Group Basics

Rechat's responses follow a set of conventions which are described below.

* All responses are JSON formatted.
* All responses are Objects.
* All responses have a `code`.
* If the operation has been successfull then `code = 'OK'`

#Group Errors

All errors will have a:

* `code` that explains the error,
* A `message` that gives some information about the error

### Example Error [GET /rooms/:id]
<!-- include(tests/room/getRoom404.md) -->


#Group Format

## Single Entities

If the called endpoint is supposed to provide a single entity, the entity will be stored in `data` key.

## Collections

If the called endpoint is supposed to provide a collection of entities,
the `data` key will be an array of all retrieved entities.

An `info` object will also be provided that includes:
* `count` The number of retrieved entities that are present in the `data`
* `total` Total number of matching entities which coule be fetched using pagination


### Example single entity endpoint [GET /rooms/:id]
<!-- include(tests/room/getRoom.md) -->

### Example collection endpoint [GET /rooms]
<!-- include(tests/room/getUserRooms.md) -->

#Group Associations

Rechat is heavily relational and the need to have access to the associations within an object.

There are two formats that are supported.

1. Nested (default, legacy). All entities are already deeply nested in this format.
   But the response size could be too big.

2. Referenced. (prefered). Data objects are not nested but the response is compact.

## Nested responses

::: warning
  Nested responses are considered harmful. They are only being used for backward compatibility reasons.
:::

A nested example looks like this:

``` javascript
{
  code: 'OK',
  data: {
    id: 1,
    type: 'room'
    owner: {
      id: 1,
      type: 'user',
      email: 'john@doe.org'
    },
    users: [
      {
        id: 1,
        type: 'user',
        email: 'john@doe.org'
      },
      {
        id: 2,
        type: 'user',
        email: 'jane@smith.org'
      }
    ],
    latest_message: {
      id: 1,
      comment: 'Hi',
      author: {
        id: 1,
        type: 'user',
        email: 'john@doe.org'
      }
    }
  }
}
```
As you can see in the object above, User #1 is the owner of the room and author of the latest message.
He is also one of the members of the room.

Therefore, his user object is repeated 3 times and thus, inflating the response.

## Referenced

Provide the following header:

```
X-RECHAT-FORMAT: references
```

And the response format you'll get the following format:

``` javascript
{
  code: 'OK',
  references: {
    user: {
      1: {
        id: 1,
        type: 'user',
        email: 'john@doe.org'
      },

      2: {
        id: 2,
        type: 'user',
        email: 'jane@smith.org'
      }
    },

    message: {
      1: {
        id: 1,
        comment: 'Hi',
        author: {
          type: 'reference',
          model: 'user',
          id:1,
        }
      }
    }
  }
  data: {
    id: 1,
    type: 'room'
    owner: ,
    users: [
      {
        type: 'reference',
        model: 'user',
        id:1,
      },
      {
        type: 'reference',
        model: 'user',
        id:2,
      }
    ]
    latest_message: {
      type: 'reference',
      model: 'message',
      id: 1
    }
  }
}
```

The advantage to this format is that no matter how many times we repeat `user #1` (or any other entity)
the response size will not grow a lot.

### Example nested responsed [GET /rooms]
<!-- include(tests/room/getUserRooms.md) -->

### Example referenced responsed [GET /rooms]
<!-- include(tests/room/getReferencedUserRooms.md) -->
