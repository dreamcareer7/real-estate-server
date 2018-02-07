const reminderSchema = {
  type: 'object',
  properties: {
    time: {
      type: 'number'
    },
    is_relative: {
      type: 'boolean',
      required: true
    }
  },
  oneOf: [{
    required: ['time']
  }, {
    required: ['timestamp']
  }]
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
    start: {
      type: 'number'
    },
    limit: {
      type: 'number'
    }
  }
}

const taskSchema = {
  type: 'object',
  required: [
    'title',
    'due_date',
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
      type: 'number',
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
      type: ['string', 'null'],
      uuid: true
    },
    deal: {
      type: ['string', 'null'],
      uuid: true
    },
    listing: {
      type: ['string', 'null'],
      uuid: true
    }
  }
}

module.exports = {
  reminderSchema,
  getAllOptionsSchema,
  taskSchema,
}