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
      alphabet: {
        type: 'string',
        required: false,
        description: 'Filter by first letter of last name (sort_field)',
        example: 'a'
      },
      users: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'Owner of the contact'
      },
      crm_task: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'CrmTask association query'
      },
      ids: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'List of specific contact ids to include'
      },
      excludes: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'List of specific contact ids to exclude'
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
      lists: {
        type: 'string',
        required: false,
        uuid: true,
        description: 'Belongs to list'
      },
      created_gte: {
        type: 'number',
        required: false,
        description: 'Created after'
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
      last_touch_gte: {
        type: 'number',
        required: false,
        description: 'Last touch after'
      },
      last_touch_lte: {
        type: 'number',
        required: false,
        description: 'Last touch before'
      },
      next_touch_gte: {
        type: 'number',
        required: false,
        description: 'Next touch after'
      },
      next_touch_lte: {
        type: 'number',
        required: false,
        description: 'Next touch before'
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
