module.exports = {
  global: {
    associations: {
      type: 'array',
      required: false,
      forced: false
    }
  },
  'GET /contacts': {
    params: {
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
  },
  'POST /contacts/filter': {
    params: {
      q: {
        type: 'string',
        required: false,
        description: 'String search in title and description',
        example: 'Hello World'
      },
      user: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'Owner of the contact'
      },
      created_by: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'Creator of the contact'
      },
      updated_by: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'The last person who has updated the contact'
      },
      list: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'Belongs to list'
      },
      created_gte: {
        type: 'number',
        required: false,
        description: 'Creater after'
      },
      created_lte: {
        type: 'number',
        required: false,
        description: 'Created before'
      },
      updated_gte: {
        type: 'number',
        required: false,
        description: 'Last updated after'
      },
      updated_lte: {
        type: 'number',
        required: false,
        description: 'Last updated before'
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
