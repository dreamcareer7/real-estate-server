const syncMembers = (cb) => {
  return frisby.create('Sync BrokerWolf Members')
  .post('/jobs', {
    name: 'BrokerWolf.Members.Sync'
  })
  .after(cb)
  .expectStatus(200)
}

const syncClassifications = (cb) => {
  return frisby.create('Sync BrokerWolf Classifications')
  .post('/jobs', {
    name: 'BrokerWolf.Classifications.Sync'
  })
  .after(cb)
  .expectStatus(200)
}

module.exports = {
//   syncMembers,
  syncClassifications
}
