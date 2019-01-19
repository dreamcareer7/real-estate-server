const settings = require('./data/brokerwolf/settings')

registerSuite('brand', [
  'createParent',
  'create'
])

let brand

const saveSettings = cb => {
  brand = results.brand.create.data.id

  return frisby.create('Save BrokerWolf Settings for a brand')
    .post('/jobs', {
      name: 'BrokerWolf.Settings.Save',
      data: {
        brand,
        ...settings
      }
    })
    .after(cb)
    .expectStatus(200)
}

const syncMembers = (cb) => {
  return frisby.create('Sync BrokerWolf Members')
    .post('/jobs', {
      name: 'BrokerWolf.Members.Sync',
      data: { brand }
    })
    .after(cb)
    .expectStatus(200)
}

const syncClassifications = (cb) => {
  return frisby.create('Sync BrokerWolf Classifications')
    .post('/jobs', {
      name: 'BrokerWolf.Classifications.Sync',
      data: { brand }
    })
    .after(cb)
    .expectStatus(200)
}

const mapClassification = (cb) => {
  return frisby.create('Map BrokerWolf Classification')
    .post('/jobs', {
      name: 'BrokerWolf.Classifications.map',
      data: {
        brokerwolf_id: results.brokerwolf.syncClassifications[0].Id,
        ender_type: 'Buying',
      }
    })
    .after(cb)
    .expectStatus(200)
}

const syncPropertyTypes = (cb) => {
  return frisby.create('Sync BrokerWolf Property Types')
    .post('/jobs', {
      name: 'BrokerWolf.PropertyTypes.Sync',
      data: { brand }
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
        property_types: ['Resale']
      }
    })
    .after(cb)
    .expectStatus(200)
}

const syncContactTypes = (cb) => {
  return frisby.create('Sync BrokerWolf Contact Types')
    .post('/jobs', {
      name: 'BrokerWolf.ContactTypes.Sync',
      data: { brand }
    })
    .after(cb)
    .expectStatus(200)
}

const mapContactType = (cb) => {
  return frisby.create('Map BrokerWolf Contact Type')
    .post('/jobs', {
      name: 'BrokerWolf.ContactTypes.map',
      data: {
        brokerwolf_id: results.brokerwolf.syncContactTypes[0].Id,
        role: ['SellerAgent']
      }
    })
    .after(cb)
    .expectStatus(200)
}


module.exports = {
  saveSettings,
  syncMembers,
  syncClassifications,
  mapClassification,
  syncPropertyTypes,
  mapPropertyType,
  syncContactTypes,
  mapContactType,
}
