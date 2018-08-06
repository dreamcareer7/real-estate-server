const {
  associationSchema,
} = require('../Association/schemas')


const getAllOptionsSchema = {
  type: 'object',
  properties: {
    q: {
      type: 'array'
    },
    created_by: {
      type: 'string',
      uuid: true
    },
    contact: {
      type: 'string',
      uuid: true
    },
    deal: {
      type: 'string',
      uuid: true
    },
    listing: {
      type: 'string',
      uuid: true
    },
    timestamp_lte: {
      type: 'number'
    },
    timestamp_gte: {
      type: 'number'
    },
    start: {
      type: 'number'
    },
    limit: {
      type: 'number'
    },
    order: {
      type: 'string',
      enum: [
        'timestamp',
        '-timestamp',
        'created_at',
        '-created_at',
        'updated_at',
        '-updated_at'
      ]
    }
  }
}

const touchSchema = {
  type: 'object',
  required: ['title', 'timestamp', 'activity_type'],
  properties: {
    description: {
      type: 'string'
    },
    timestamp: {
      type: 'number',
      required: true
    },
    activity_type: {
      type: 'string',
      required: true,
      enum: [
        'Meeting',
        'Call',
        'Text',
        'Email',
        'Mail',
        'Social'
      ]
    },
    outcome: {
      type: 'string'
    },

    associations: {
      type: 'array',
      items: associationSchema
    }
  }
}

module.exports = {
  touchSchema,
  getAllOptionsSchema,
}