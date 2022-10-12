const async = require('async')

const promisify = require('../../utils/promisify')
const { peanar } = require('../../utils/peanar')

const createContext = require('../../../scripts/workers/utils/create-context')

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

let i = 0

const cargo = async.cargo(async (photos, cb) => {
  try {
    const { commit, rollback, run } = await createContext({
      id: `process-photos-${i++}`
    })

    await run(async () => {
      try {
        await Photo.create(photos)
        await commit()
      } catch(e) {
        rollback(e)
        throw e
      }
    })
    return cb()
    
  } catch(e) {
    return cb(e)
  }
})

function mls_photo(data) {
  return new Promise((resolve, reject) => {
    cargo.push({
      ...data.processed,
      revision: data.revision || 1,
    }, (err, res) => {
      if (err)
        return reject(err)
      resolve(res)
    })
  })
}

async function mls_listing(data) {
  Context.set({ 'db:log': true })
  return promisify(Listing.create)({
    ...data.processed,
    ignoreRevision: data?.ignoreRevision,
    revision: data.revision || 1,
  })
}

async function mls_listing_validate(data) {
  return promisify(Listing.delete)({
    muis: data.muis,
    mls: data.mls,
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
  mls_photo: peanar.job(jobDef({ handler: mls_photo, name: 'mls_photo', queue: 'MLS.Photo', context: false })),
  mls_listing: peanar.job(
    jobDef({ handler: mls_listing, name: 'mls_listing', queue: 'MLS.Listing' })
  ),
  mls_listing_validate: peanar.job(
    jobDef({ handler: mls_listing_validate, name: 'mls_listing_validate', queue: 'MLS.Listing.Validate' })
  ),
  mls_validate_listing_photos: peanar.job(
    jobDef({
      handler: mls_validate_listing_photos,
      name: 'mls_validate_listing_photos',
      queue: 'MLS.Listing.Photos.Validate',
    })
  ),
}
