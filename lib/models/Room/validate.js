const validator = require('../../utils/validator.js')

const schema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: false
    },

    owner: {
      type: 'string',
      uuid: true,
      required: false
    },

    room_type: {
      type: 'string',
      required: true,
      enum: [ 'Group', 'Direct', 'Personal', 'Task', 'ListingBoard' ]
    },

    users: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: ['object', 'string']
      }
    },

    phone_numbers: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        phone: true
      }
    },

    emails: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        email: true
      }
    }
  }
}

const validate = validator.bind(null, schema)

module.exports = { validate }
