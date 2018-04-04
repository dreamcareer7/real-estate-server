module.exports = {
  global: {
    associations: {
      type: 'array',
      required: false,
      forced: false
    }
  },
  'GET /crm/activities': {
    start: {
      type: 'number',
      required: false,
      default: 0
    },
    limit: {
      type: 'number',
      required: false,
      default: 10
    },
    order: {
      type: 'string',
      required: false,
      enum: ['timestamp', 'created_at', 'updated_at'],
      example: '-timestamp',
      description: 'Put a minus sign before field name for descending order'
    }
  },
  'GET /crm/activities/search': {
    params: {
      q: {
        type: 'string',
        required: false,
        description: 'String search in title and description',
        example: 'Hello World'
      },
      assignee: {
        type: 'string',
        required: false,
        uuid: true
      },
      contact: {
        type: 'string',
        required: false,
        uuid: true
      },
      deal: {
        type: 'string',
        required: false,
        uuid: true
      },
      listing: {
        type: 'string',
        required: false,
        uuid: true
      },
      timestamp_gte: {
        type: 'number',
        required: false,
        description: 'Timestamp greater than or equal to'
      },
      timestamp_lte: {
        type: 'number',
        required: false,
        description: 'Timestamp less than or equal to'
      },
      activity_type: {
        type: 'string',
        required: false,
        enum: [
          'Closing',
          'Inspection',
          'Tour',
          'Listing appointment',
          'Follow up',
          'Call',
          'Message',
          'Todo',
          'Open House'
        ]
      },
      start: {
        type: 'number',
        required: false,
        default: 0
      },
      limit: {
        type: 'number',
        required: false,
        default: 10
      },
      order: {
        type: 'string',
        required: false,
        enum: ['timestamp', 'created_at', 'updated_at'],
        example: '-timestamp',
        description: 'Put a minus sign before field name for descending order'
      }
    }
  },
  'DELETE /crm/activities/:id/associations': {
    ids: {
      type: 'array',
      required: true
    }
  }
}
