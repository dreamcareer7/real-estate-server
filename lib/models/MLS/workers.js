const promisify = require('../../utils/promisify')
const { peanar } = require('../../utils/peanar')

const Agent = require('../Agent')
const Photo = require('../Photo')
const Office = require('../Office')
const OpenHouse = require('../OpenHouse')
const PropertyRoom = require('../PropertyRoom')
const PropertyUnit = require('../PropertyUnit')
const { Listing } = require('../Listing')

async function mls_unit(data) {
  return PropertyUnit.create(data.processed)
}

async function mls_openhouse(data) {
  return OpenHouse.create(data.processed)
}

async function mls_room(data) {
  return PropertyRoom.create(data.processed)
}

async function mls_agent(data) {
  return Agent.create(data.processed)
}

async function mls_office(data) {
  return Office.create(data.processed)
}

async function mls_photo(data) {
  return Photo.create({
    ...data.processed,
    revision: data.revision
  })
}

async function mls_listing(data) {
  return promisify(Listing.create)({
    ...data.processed,
    revision: data.revision
  })
}

async function mls_validate_listing_photos(data) {
  return Photo.deleteMissing(data.listing, data.present)
}

function jobDef(overrides) {
  return Object.assign({
    max_retries: 1000,
    retry_delay: 10000,
    error_exchange: `${overrides.queue}.error`,
    retry_exchange: `${overrides.queue}.retry`
  }, overrides)
}

module.exports = {
  mls_unit: peanar.job(mls_unit, jobDef({ name: 'mls_unit', queue: 'MLS.Unit', exchange: 'mls' })),
  mls_openhouse: peanar.job(mls_openhouse, jobDef({ name: 'mls_openhouse', queue: 'MLS.OpenHouse', exchange: 'mls' })),
  mls_room: peanar.job(mls_room, jobDef({ name: 'mls_room', queue: 'MLS.Room', exchange: 'mls' })),
  mls_agent: peanar.job(mls_agent, jobDef({ name: 'mls_agent', queue: 'MLS.Agent', exchange: 'mls' })),
  mls_office: peanar.job(mls_office, jobDef({ name: 'mls_office', queue: 'MLS.Office', exchange: 'mls' })),
  mls_photo: peanar.job(mls_photo, jobDef({ name: 'mls_photo', queue: 'MLS.Photo', exchange: 'mls' })),
  mls_listing: peanar.job(mls_listing, jobDef({ name: 'mls_listing', queue: 'MLS.Listing', exchange: 'mls' })),
  mls_validate_listing_photos: peanar.job(mls_validate_listing_photos, jobDef({
    name: 'mls_validate_listing_photos',
    queue: 'MLS.Listing.Photos.Validate',
    exchange: 'mls'
  }))
}
