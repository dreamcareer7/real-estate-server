const reminderSchema = {
  type: 'object',
  properties: {
    timestamp: {
      type: 'number',
      required: true
    },
    is_relative: {
      type: 'boolean',
      required: true
    }
  },
  required: ['is_relative', 'timestamp']
}

const getAllOptionsSchema = {
  type: 'object',
  properties: {
    q: {
      type: 'array'
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
    },
    due_lte: {
      type: 'number'
    },
    due_gte: {
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
        'due_date',
        '-due_date',
        'created_at',
        '-created_at',
        'updated_at',
        '-updated_at'
      ]
    }
  }
}

const dealAssociationSchema = {
  properties: {
    deal: {
      type: 'string',
      uuid: true
    }
  },
  required: ['deal']
}

const contactAssociationSchema = {
  properties: {
    contact: {
      type: 'string',
      uuid: true
    }
  },
  required: ['contact']
}

const listingAssociationSchema = {
  properties: {
    listing: {
      type: 'string',
      uuid: true
    }
  },
  required: ['listing']
}

const associationSchema = {
  type: 'object',
  properties: {
    assocation_type: {
      type: 'string',
      enum: [
        'contact',
        'deal',
        'listing'
      ]
    }
  },
  oneOf: [
    dealAssociationSchema,
    contactAssociationSchema,
    listingAssociationSchema
  ]
}

const taskSchema = {
  type: 'object',
  required: ['title', 'due_date', 'task_type'],
  properties: {
    title: {
      type: 'string',
      required: true,
      minLength: 1
    },
    description: {
      type: 'string'
    },
    due_date: {
      type: 'number',
      required: true
    },
    status: {
      type: 'string',
      enum: ['PENDING', 'DONE']
    },
    task_type: {
      type: 'string',
      required: true,
      enum: [
        'Call',
        'Message',
        'Todo',
        'Event',
        'Meeting'
      ]
    },

    reminders: {
      type: 'array',
      item: reminderSchema
    },

    assignee: {
      type: 'string',
      uuid: true
    },
    associations: {
      type: 'array',
      items: associationSchema
    }
  }
}

module.exports = {
  reminderSchema,
  getAllOptionsSchema,
  taskSchema,
  associationSchema,
}
