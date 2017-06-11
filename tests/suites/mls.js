const listing = require('./mls/listing.js')
const office = require('./mls/office.js')

const addListing = (cb) => {
  return frisby.create('add a listing')
    .post('/jobs', {
      name: 'MLS.Listing',
      data: {processed:listing}
    })
    .after(cb)
    .expectStatus(200)
}

const addOffice = (cb) => {
  return frisby.create('add an office')
    .post('/jobs', {
      name: 'MLS.Office',
      data: {processed:office}
    })
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  addListing,
  addOffice
}
