const validator = require('../utils/validator.js')
const db = require('../utils/db.js')
const async = require('async')

CMA = {}
Orm.register('cma', 'CMA')

const schema = {
  type: 'object',
  properties: {
    suggested_price: {
      type: 'number',
      required: false
    },

    comment: {
      type: 'string',
      required: false
    },

    user: {
      type: 'string',
      uuid: true,
      required: true
    },

    room: {
      type: 'string',
      uuid: true,
      required: true
    },

    main_listing: {
      type: 'string',
      uuid: true,
      required: true
    },

    listings: {
      type: 'array',
      required: true,
      minItems: 1,
      items: {
        type: 'string',
        uuid: true,
        required: true
      }
    },

    lowest_price: {
      type: 'number',
      required: true
    },

    average_price: {
      type: 'number',
      required: true
    },

    highest_price: {
      type: 'number',
      required: true
    },

    lowest_dom: {
      type: 'number',
      required: true
    },

    average_dom: {
      type: 'number',
      required: true
    },

    highest_dom: {
      type: 'number',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

CMA.create = function (cma, cb) {
  async.auto({
    validate: cb => {
      return validate(cma, cb)
    },
    user: cb => {
      return User.get(cma.user, cb)
    },
    room: cb => {
      return Room.get(cma.room, cb)
    },
    listings: cb => {
      Listing.getAll(cma.listings, cb)
    },
    create: [
      'validate',
      'user',
      'room',
      'listings',
      (cb) => {
        return db.query('cma/insert', [
          cma.user,
          cma.room,
          cma.suggested_price,
          cma.comment,
          cma.main_listing,
          cma.listings,
          cma.lowest_price,
          cma.average_price,
          cma.highest_price,
          cma.lowest_dom,
          cma.average_dom,
          cma.highest_dom
        ], (err, res) => {
          if (err)
            return cb(err)

          return cb(null, res.rows[0].id)
        })
      }
    ],
    notification: [
      'user',
      'room',
      'create',
      (cb, results) => {
        const notification = {}

        notification.action = 'Created'
        notification.subject = cma.user
        notification.subject_class = 'User'
        notification.object = results.create
        notification.object_class = 'CMA'
        notification.auxiliary_object = cma.room
        notification.auxiliary_object_class = 'Room'
        notification.message = '@' + results.user.first_name + ' created a CMA for room #' + results.room.proposed_title
        notification.room = cma.room

        return Notification.issueForRoomExcept(notification, cma.user, cb)
      }
    ],
    get: [
      'create',
      (cb, results) => {
        return CMA.get(results.create, cb)
      }
    ]
  }, function (err, results) {
    if (err)
      return cb(err)

    return cb(null, results.get)
  })
}

CMA.get = function (id, cb) {
  CMA.getAll([id], (err, cmas) => {
    if (err)
      return cb(err)

    if (cmas.length < 1)
      return cb(Error.ResourceNotFound(`CMA ${id} not found`))

    const cma = cmas[0]

    return cb(null, cma)
  })
}

CMA.getAll = function (cma_ids, cb) {
  db.query('cma/get', [cma_ids], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

CMA.delete = function (id, cb) {
  CMA.get(id, err => {
    if (err)
      return cb(err)

    db.query('cma/delete', [id], err => {
      if (err)
        return cb(err)

      return cb()
    })
  })
}

CMA.getForRoom = function (id, cb) {
  Room.get(id, err => {
    if (err)
      return cb(err)

    db.query('cma/room', [id], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(null, [])

      const cma_ids = res.rows.map(r => r.id)

      CMA.getAll(cma_ids, cb)
    })
  })
}

CMA.getListings = function (id, cb) {
  CMA.get(id, (err, cma) => {
    if (err)
      return cb(err)

    Listing.getAll(cma.listings, cb)
  })
}

CMA.associations = {
  main_listing: {
    model: 'Listing'
  }
}
