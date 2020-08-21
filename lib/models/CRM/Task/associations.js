const associations = {
  assignees: {
    enabled: false,
    model: 'User',
    collection: true
  },

  associations: {
    enabled: false,
    collection: true,
    model: 'CrmAssociation'
  },

  created_by: {
    enabled: false,
    model: 'User'
  },

  updated_by: {
    enabled: false,
    model: 'User'
  },

  files: {
    collection: true,
    enabled: false,
    model: 'AttachedFile'
  },

  reminders: {
    enabled: false,
    model: 'Reminder',
    collection: true
  }
}

module.exports = associations