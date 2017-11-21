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

const syncPropertyTypes = (cb) => {
  return frisby.create('Sync BrokerWolf Property Types')
  .post('/jobs', {
    name: 'BrokerWolf.PropertyTypes.Sync'
  })
  .after(cb)
  .expectStatus(200)
}

const mapPropertyType = (cb) => {
  return frisby.create('Map BrokerWolf Property Type')
  .post('/jobs', {
    name: 'BrokerWolf.PropertyTypes.map',
    data: {
      brokerwolf_id: results.brokerwolf.syncPropertyTypes[0].Id,
      property_type: 'Resale'
    }
  })
  .after(cb)
  .expectStatus(200)
}

module.exports = {
  syncMembers,
  syncClassifications,
  syncPropertyTypes,
  mapPropertyType
}
