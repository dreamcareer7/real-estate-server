const listing = require('./mls/listing.js')
const openhouse = require('./mls/openhouse.js')
const room = require('./mls/room.js')
const unit = require('./mls/unit.js')
const photo = require('./mls/photo.js')

registerSuite('room', ['create'])

const saveAlert = cb => {
  const criteria = {
    property_types: ['Residential'],
    property_subtypes: ['RES-Condo', 'RES-Farm/Ranch', 'RES-Half Duplex', 'RES-Townhouse', 'RES-Single Family'],
    minimum_price: listing.listing.price - 1,
    maximum_price: listing.listing.price + 1,
  }

  return frisby.create('create alert')
    .post('/rooms/' + results.room.create.data.id + '/alerts', criteria)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: criteria
    })
}

const addListing = (cb) => {
  return frisby.create('add a listing')
    .post('/jobs', {
      name: 'MLS.Listing',
      data: {
        processed: listing,
        revision: 1
      }
    })
    .after(cb)
    .expectStatus(200)
}

const getFeed = cb => {
  return frisby.create('get feed')
    .get('/rooms/' + results.room.create.data.id + '/recs/feed')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        listing: {
          revision: 1
        }
      }],
      info: {
        count: 1
      }
    })
}

const addOpenHouse = (cb) => {
  return frisby.create('add an open house')
    .post('/jobs', {
      name: 'MLS.OpenHouse',
      data: {processed: openhouse}
    })
    .after(cb)
    .expectStatus(200)
}

const priceDrop = (cb) => {
  listing.listing.price -= 3000

  return frisby.create('change price')
    .post('/jobs', {
      name: 'MLS.Listing',
      data: {processed: listing}
    })
    .after(cb)
    .expectStatus(200)
}

const statusChange = (cb) => {
  listing.listing.status = 'Sold'

  return frisby.create('change status')
    .post('/jobs', {
      name: 'MLS.Listing',
      data: {processed: listing}
    })
    .after(cb)
    .expectStatus(200)
}

const addRoom = (cb) => {
  return frisby.create('add a room')
    .post('/jobs', {
      name: 'MLS.Room',
      data: {processed: room}
    })
    .after(cb)
    .expectStatus(200)
}

const addUnit = (cb) => {
  return frisby.create('add a unit')
    .post('/jobs', {
      name: 'MLS.Unit',
      data: {processed: unit}
    })
    .after(cb)
    .expectStatus(200)
}

const addPhoto = (cb) => {
  return frisby.create('add a photo')
    .post('/jobs', {
      name: 'MLS.Photo',
      data: {processed: photo}
    })
    .after(cb)
    .expectStatus(200)
}

const refresher = (name, description) => {
  return cb => {
    return frisby.create(name)
      .post('/jobs', {
        name
      })
      .after(cb)
      .expectStatus(200)
  }
}

const refreshSubdivisions = refresher('Refresh.Subdivisions', 'Refresh Subdivisions')
const refreshSchools = refresher('Refresh.Schools', 'Refresh Schools')
const refreshCounties = refresher('Refresh.Counties', 'Refresh Counties')
const refreshAreas = refresher('Refresh.Areas', 'Refresh Areas')
const refreshAgents = refresher('Refresh.Agents', 'Refresh Agent Contacts')

module.exports = {
  saveAlert,
  addListing,
  getFeed,
  addOpenHouse,
  priceDrop,
  statusChange,
  addRoom,
  addUnit,
  addPhoto,

  refreshSubdivisions,
  refreshSchools,
  refreshCounties,
  refreshAreas,
  refreshAgents
}
