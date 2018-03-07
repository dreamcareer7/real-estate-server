module.exports = {
  'GET /crm/tasks': {
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
      due_gte: {
        type: 'number',
        required: false,
        description: 'Due date greater than or equal to'
      },
      due_lte: {
        type: 'number',
        required: false,
        description: 'Due date less than or equal to'
      },
      status: {
        type: 'string',
        required: false,
        enum: ['PENDING', 'DONE']
      },
      task_type: {
        type: 'string',
        required: false,
        enum: ['Call', 'Message', 'Todo']
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
          'due_date',
          'created_at',
          'updated_at'
        ],
        example: '-due_date',
        description: 'Put a minus sign before field name for descending order'
      }
    }
  }
}