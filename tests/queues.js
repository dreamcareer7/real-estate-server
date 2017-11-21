const nodeify = fn => {
  return cb => {
    fn().nodeify(cb)
  }
}

const mapBrokerwolfProperty = (job, cb) => {
  BrokerWolf.PropertyTypes.map(job.data).nodeify(cb)
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
  'BrokerWolf.PropertyTypes.Sync': nodeify(BrokerWolf.PropertyTypes.sync),
  'BrokerWolf.PropertyTypes.map': mapBrokerwolfProperty
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