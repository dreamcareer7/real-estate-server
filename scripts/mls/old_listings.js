#!/usr/bin/env node

const Client = require('./rets_client.js')
const async = require('async')
const util = require('util')

Error.autoReport = false

const program = require('./program.js')
const options = program.parse(process.argv)

options.processor = processData

options.resource = 'Property'
options.class = 'Listing'
options.job = 'old_listings'

function upsertAddress (address, cb) {
  Address.getByMUI(address.matrix_unique_id, function (err, current) {
    if (current)
      return cb(null, current.id)

    Metric.increment('mls.old.new_address')
    Address.create(address, cb)
  })
}

function upsertProperty (property, address_id, cb) {
  property.address_id = address_id

  Property.getByMUI(property.matrix_unique_id, function (err, current) {
    if (current)
      return cb(null, current.id)

    Metric.increment('mls.old.new_property')
    Property.create(property, cb)
  })
}

function upsertListing (listing, property_id, cb) {
  listing.property_id = property_id

  Listing.getByMUI(listing.matrix_unique_id, function (err, current) {
    if (current)
      return cb(null, current.id)

    Metric.increment('mls.old.new_listing')
    Listing.create(listing, cb)
  })
}

function processData (cb, results) {
  async.mapLimit(results.mls, 200, createObjects, cb)
}

const populate = require('./populate.js')
function createObjects (data, cb) {
  const populated = populate(data)
  const address = populated.address
  const property = populated.property
  const listing = populated.listing

  Metric.increment('mls.old.processed_listing')

  async.waterfall([
    upsertAddress.bind(null, address),
    upsertProperty.bind(null, property),
    upsertListing.bind(null, listing)
  ], cb)
}

MLSJob.getLastRun(options.job, (err, last_run) => {
  if (err)
    throw new Error(err)

  if (!last_run)
    last_run = {
      last_modified_date: new Date()
    }

  const q = buildQuery(last_run)
  options.query = q

  Client.work(options, report)
})

Client.on('data fetched', (data) => console.log('Fetched', data.length))

function report (err) {
  if (err)
    console.log(err)

  process.exit()
}

function buildQuery (last_run) {
  options.limit = 20000

  if (last_run.results === options.limit) {
    // Last run had most possible results. We should fetch next page.
    console.log('Next page')
    options.offset = last_run.offset + options.limit

    Client.once('saving job', (job) => {
      job.last_modified_date = last_run.last_modified_date.toISOString()
    })

    return last_run.query
  }

  const query = '(MatrixModifiedDT=%s-),(MatrixModifiedDT=%s+)'

  const from = last_run.last_modified_date
  const to = new Date(from.getTime() - (1000 * 3600 * 96))

  Client.once('saving job', (job) => {
    job.last_modified_date = to.toISOString()
  })

  options.offset = 0

  return util.format(query, from.toNTREISString(), to.toNTREISString())
}
