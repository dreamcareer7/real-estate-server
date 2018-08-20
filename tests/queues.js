const nodeify = fn => {
  return cb => {
    fn().nodeify(cb)
  }
}

const mapBrokerwolfProperty = (job, cb) => {
  BrokerWolf.PropertyTypes.map(job.data).nodeify(cb)
}

const mapBrokerwolfClassification = (job, cb) => {
  BrokerWolf.Classifications.map(job.data).nodeify(cb)
}

const mapBrokerwolfContact = (job, cb) => {
  BrokerWolf.ContactTypes.map(job.data).nodeify(cb)
}

const sendTaskNotifications = (job, cb) => {
  Task.sendNotifications().nodeify(cb)
}

const createEmail = (job, cb) => {
  Email.create(job.data).nodeify(cb)
}

const storeEmailId = (job, cb) => {
  Email.storeId(job.data.email, job.data.mailgun_id).nodeify(cb)
}

const list = {
  'Refresh.Subdivisions': Listing.refreshSubdivisions,
  'Refresh.Schools': School.refresh,
  'Refresh.Listings': Alert.refreshFilters,
  'Refresh.Counties': Listing.refreshCounties,
  'Refresh.Areas': Listing.refreshAreas,
  'Refresh.Agents': Agent.refreshContacts,
  'Seamless.Email': Message.sendEmailForUnread,
  'Seamless.SMS': Notification.sendForUnread,
  'BrokerWolf.Members.Sync': nodeify(BrokerWolf.Members.sync),
  'BrokerWolf.Classifications.Sync': nodeify(BrokerWolf.Classifications.sync),
  'BrokerWolf.Classifications.map': mapBrokerwolfClassification,
  'BrokerWolf.PropertyTypes.Sync': nodeify(BrokerWolf.PropertyTypes.sync),
  'BrokerWolf.PropertyTypes.map': mapBrokerwolfProperty,
  'BrokerWolf.ContactTypes.Sync': nodeify(BrokerWolf.ContactTypes.sync),
  'BrokerWolf.ContactTypes.map': mapBrokerwolfContact,
  'Task.sendNotifications': sendTaskNotifications,
  'Email.create': createEmail,
  'Email.storeId': storeEmailId
}

const queues = {}

Object.keys(list).forEach(name => {
  const handler = (job, done) => {
    if (list[name].length === 1)
      list[name](done)
    else
      list[name](job, done)
  }

  queues[name] = {
    handler,
    parallel: 1
  }
})

module.exports = queues