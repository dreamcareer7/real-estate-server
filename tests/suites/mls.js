const listing = require('./mls/listing.js')
const office = require('./mls/office.js')
const openhouse = require('./mls/openhouse.js')
const agent = require('./mls/agent.js')
const room = require('./mls/room.js')
const unit = require('./mls/unit.js')
const photo = require('./mls/photo.js')

registerSuite('room', ['create'])

const saveAlert = cb => {
  const criteria = {
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
      data: {processed: listing}
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

const addOffice = (cb) => {
  return frisby.create('add an office')
    .post('/jobs', {
      name: 'MLS.Office',
      data: {processed: office}
    })
    .after(cb)
    .expectStatus(200)
}

const addAgent = (cb) => {
  return frisby.create('add an agent')
    .post('/jobs', {
      name: 'MLS.Agent',
      data: {processed: agent}
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

module.exports = {
  saveAlert,
  addListing,
  getFeed,
  addOpenHouse,
  priceDrop,
  statusChange,
  addOffice,
  addAgent,
  addRoom,
  addUnit,
  addPhoto
}
