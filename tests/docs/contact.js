module.exports = {
  global: {
    associations: {
      type: 'array',
      required: false,
      forced: false
    }
  },
  'GET /contacts': {
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
      enum: [
        'display_name',
        'sort_field',
        'last_touch',
        'next_touch',
        'created_at',
        'updated_at'
      ],
      example: 'sort_field',
      description: 'Put a minus sign before field name for descending order'
    }
  },
  'POST /contacts/filter': {
    params: {
      q: {
        type: 'string',
        required: false,
        description: 'String search in title and description',
        example: 'Hello World'
      },
      owner: {
        type: 'string',
        required: false,
        uuid: true
      },
      listing: {
        type: 'string',
        required: false,
        uuid: true
      },
      updated_gte: {
        type: 'number',
        required: false,
        description: 'Timestamp greater than or equal to'
      },
      updated_lte: {
        type: 'number',
        required: false,
        description: 'Timestamp less than or equal to'
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
        enum: [
          'display_name',
          'sort_field',
          'last_touch',
          'next_touch',
          'created_at',
          'updated_at'
        ],
        example: 'sort_field',
        description: 'Put a minus sign before field name for descending order'
      }
    }
  }
}
