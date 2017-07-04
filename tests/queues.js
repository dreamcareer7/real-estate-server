const list = {
  'Refresh.Subdivisions': Listing.refreshSubdivisions,
  'Refresh.Schools': School.refresh,
  'Refresh.Listings': Alert.refreshFilters,
  'Refresh.Counties': Listing.refreshCounties,
  'Refresh.Areas': Listing.refreshAreas,
  'Refresh.Agents': Agent.refreshContacts,
  'Seamless.Email': Message.sendEmailForUnread,
  'Seamless.SMS': Notification.sendForUnread
}

const queues = {}

Object.keys(list).forEach(name => {
  const handler = (job, done) => {
    list[name](done)
  }

  queues[name] = {
    handler,
    parallel: 1
  }
})

module.exports = queues