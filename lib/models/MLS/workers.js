const throttle = require('lodash/throttle')
const promisify = require('../../utils/promisify')
const { peanar } = require('../../utils/peanar')

const Context = require('../Context')
const Agent = require('../Agent')
const Photo = require('../Photo')
const Office = require('../Office/create')
const OpenHouse = require('../OpenHouse/create')
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

let photos = []
async function bulkCreatePhotos() {
  await Photo.createMany(photos)
  photos = []
}
const createPhotos = throttle(bulkCreatePhotos, 1000)

async function mls_photo_bulk(data) {
  photos.push({
    ...data.processed,
    revision: data.revision || 1,
  })
  return createPhotos()
}

async function mls_photo(data) {
  return Photo.create({
    ...data.processed,
    revision: data.revision || 1,
  })
}

async function mls_listing(data) {
  Context.set({ 'db:log': true })
  return promisify(Listing.create)({
    ...data.processed,
    revision: data.revision || 1,
  })
}

async function mls_validate_listing_photos(data) {
  return Photo.deleteMissing(data.listing, data.mls, data.present)
}

function jobDef(overrides) {
  return Object.assign(
    {
      exchange: 'mls',
      max_retries: 1000,
      retry_delay: 10000,
      error_exchange: `${overrides.queue}.error`,
      retry_exchange: `${overrides.queue}.retry`,
    },
    overrides
  )
}

module.exports = {
  mls_unit: peanar.job(jobDef({ handler: mls_unit, name: 'mls_unit', queue: 'MLS.Unit' })),
  mls_openhouse: peanar.job(
    jobDef({ handler: mls_openhouse, name: 'mls_openhouse', queue: 'MLS.OpenHouse' })
  ),
  mls_room: peanar.job(jobDef({ handler: mls_room, name: 'mls_room', queue: 'MLS.Room' })),
  mls_agent: peanar.job(jobDef({ handler: mls_agent, name: 'mls_agent', queue: 'MLS.Agent' })),
  mls_office: peanar.job(jobDef({ handler: mls_office, name: 'mls_office', queue: 'MLS.Office' })),
  mls_photo: peanar.job(jobDef({ handler: mls_photo, name: 'mls_photo', queue: 'MLS.Photo' })),
  mls_photo_bulk: peanar.job(jobDef({ handler: mls_photo_bulk, name: 'mls_photo', queue: 'MLS.Photo.Bulk' })),
  mls_listing: peanar.job(
    jobDef({ handler: mls_listing, name: 'mls_listing', queue: 'MLS.Listing' })
  ),
  mls_listing_low_priority: peanar.job(
    jobDef({ handler: mls_listing, name: 'mls_listing', queue: 'MLS.Listing.Low' })
  ),
  mls_validate_listing_photos: peanar.job(
    jobDef({
      handler: mls_validate_listing_photos,
      name: 'mls_validate_listing_photos',
      queue: 'MLS.Listing.Photos.Validate',
    })
  ),
}
