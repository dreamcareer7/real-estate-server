/**
 * @namespace controller/room
 */

const async = require('async')
const validator = require('../utils/validator.js')

const room_type_schema = {
  type: 'array',
  required: false,
  uniqueItems: true,
  minItems: 0,
  items: {
    enum: ['Group', 'Direct', 'Personal']
  }
}

/**
 * Retreives a `Room` object
 * @name getRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary GET /rooms/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function getRoom (req, res) {
  const room_id = req.params.id

  Room.get(room_id, (err, room) => {
    if (err)
      return res.error(err)

    if (!room)
      return res.error(Error.ResourcNotFound())

    return res.model(room)
  })
}

/**
 * Creates a `Room` object
 * @name createRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary POST /rooms
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createRoom (req, res) {
  const room = req.body
  room.owner = req.user.id

  Room.compose(room, (err, room) => {
    if (err)
      return res.error(err)

    Room.get(room.id, (err, room) => {
      if (err)
        return res.error(err)

      return res.model(room)
    })
  })
}

/**
 * Patches a `Room` object using partial parameters
 * @name patchRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary PATCH /rooms/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function patchRoom (req, res) {
  const room_id = req.params.id
  const data = req.body

  Room.get(room_id, (err, room) => {
    if (err)
      return res.error(err)

    Room.patch(room_id, data, (err, room) => {
      if (err)
        return res.error(err)

      return res.model(room)
    })
  })
}

/**
 * Deletes a `Room` object
 * @name deleteRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary DELETE /rooms/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function deleteRoom (req, res) {
  const room_id = req.params.id

  Room.get(room_id, (err, room) => {
    if (err)
      return res.error(err)

    Room.delete(room_id, err => {
      if (err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
  })
}

/**
 * Retrieves all `Room` objects the specified user is a member of
 * @name getUserRooms
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary GET /rooms
 * @param {request} req - request object
 * @param {response} res - response object
 */
function getUserRooms (req, res) {
  const user_id = req.user.id
  const paging = {}
  const room_type = req.query.room_types || []

  validator(room_type_schema, room_type, err => {
    if (err)
      return res.error(err)

    req.pagination(paging)
    paging.room_type = room_type

    User.get(user_id, (err, user) => {
      if (err)
        return res.error(err)

      Room.getUserRooms(user_id, paging, (err, rooms) => {
        if (err)
          return res.error(err)

        return res.collection(rooms)
      })
    })
  })
}

/**
 * Adds a `User` to a `Room`
 * @name addUser
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary POST /rooms/:id/users
 * @param {request} req - request object
 * @param {response} res - response object
 */
function addUser (req, res) {
  const users = req.body.user
  const room_id = req.params.id
  const user = req.user.id

  if (!Array.isArray(users))
    return res.error(Error.Validation('`user` property must be an array of user id`s'))

  async.map(users, (r, cb) => {
    return Room.addUser(user, r, room_id, false, cb)
  }, err => {
    if (err)
      return res.error(err)

    Room.get(room_id, (err, room) => {
      if (err)
        return res.error(err)

      return res.model(room)
    })
  })
}

function search (req, res) {
  const user_id = req.user.id
  const room_types = req.query.room_types || [ 'Group' ]
  const similarity = req.query.similarity || 0.05
  const limit = req.query.limit || 5

  validator(room_type_schema, room_types, err => {
    if (err)
      return res.error(err)

    if (req.query.q) {
      const terms = req.query.q
      const similar = (req.query.similar === 'true')

      if (similar) {
        Room.stringSearchFuzzy(user_id, terms, limit, similarity, room_types, (err, rooms) => {
          if (err)
            return res.error(err)

          return res.collection(rooms)
        })
      } else {
        Room.stringSearch(user_id, terms, limit, room_types, (err, rooms) => {
          if (err)
            return res.error(err)

          return res.collection(rooms)
        })
      }
    } else if (req.query.users || req.query.emails || req.query.phone_numbers) {
      const users = req.query.users || []
      const emails = req.query.emails || []
      let phones = req.query.phone_numbers || []

      phones = phones.map(r => {
        return ObjectUtil.formatPhoneNumberForDialing(r)
      })

      Room.searchForParties(user_id, users, emails, phones, (err, results) => {
        if (err)
          return res.error(err)

        return res.collection(results)
      })
    } else {
      return res.error(Error.Validation('Malformed search query'))
    }
  })
}

/**
 * Removes a `User` from a `Room`
 * @name removeUser
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary DELETE /rooms/:id/users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function removeUser (req, res) {
  const room_id = req.params.rid
  const user_id = req.params.id

  Room.removeUser(room_id, user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function getRoomMedia (req, res) {
  const room = req.params.id
  const paging = {}
  req.pagination(paging)

  Room.getMedia(room, paging, (err, medias) => {
    if (err) {
      res.status(401)
      return res.error(err)
    }

    return res.collection(medias)
  })
}

const router = (app) => {
  const b = app.auth.bearer

  app.get('/rooms/search', b(search))
  app.get('/rooms/:id/media', b(getRoomMedia))
  app.get('/rooms/:id', b(getRoom))
  app.get('/rooms', b(getUserRooms))
  app.post('/rooms/:id/users', b(addUser))
  app.post('/rooms', b(createRoom))
  app.put('/rooms/:id', b(patchRoom))
  app.delete('/rooms/:rid/users/:id', b(removeUser))
  app.delete('/rooms/:id', b(deleteRoom))
}

module.exports = router
