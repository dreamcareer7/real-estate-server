const reminderSchema = {
  type: 'object',
  properties: {
    time: {
      required: true,
      type: 'number'
    },
    relative_time: {
      type: 'boolean',
      required: true
    }
  }
}

const getAllOptionsSchema = {
  type: 'object',
  properties: {
    assignee: {
      type: 'string',
      uuid: true,
    },
    contact: {
      type: 'string',
      uuid: true,
    },
    deal: {
      type: 'string',
      uuid: true,
    },
    listing: {
      type: 'string',
      uuid: true,
    },
  }
}

const taskSchema = {
  type: 'object',
  required: [
    'title',
    'description',
    'due_date',
    'status',
    'task_type'
  ],
  properties: {
    title: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    due_date: {
      type: 'string',
    },
    status: {
      type: 'string',
      enum: ['PENDING', 'DONE']
    },
    task_type: {
      type: 'string',
      enum: ['Call', 'Message', 'Todo']
    },

    reminders: {
      type: 'array',
      item: reminderSchema
    },

    assignee: {
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
    }
  }
}

module.exports = {
  reminderSchema,
  getAllOptionsSchema,
  taskSchema,
}