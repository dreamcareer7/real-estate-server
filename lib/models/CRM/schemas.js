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
  oneOf: [
    {
      required: ['time']
    },
    {
      required: ['timestamp']
    }
  ]
}

const getAllOptionsSchema = {
  type: 'object',
  properties: {
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
    start: {
      type: 'number'
    },
    limit: {
      type: 'number'
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
      type: 'string'
    },
    description: {
      type: 'string'
    },
    due_date: {
      type: 'number'
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
