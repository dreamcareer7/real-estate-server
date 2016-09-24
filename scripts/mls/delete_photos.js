#!/usr/bin/env node

const async = require('async')
const Client = require('./rets_client.js')

const program = require('./program.js')

const options = program.parse(process.argv)

options.resource = 'Media'
options.class = 'Media'
options.job = 'delete_photos'
options.processor = (cb, results) => processData(results.mls, cb)
options.fields = {
  id: 'matrix_unique_id',
  modified: 'ModifiedDate'
}

const grouped = {}

function processData (photos, cb) {
  photos.forEach(photo => {
    grouped[photo.Table_MUI].push(parseInt(photo.matrix_unique_id))
  })

  const markAsDeleted = (listing_mui, cb) => {
    Photo.deleteMissing(listing_mui, grouped[listing_mui], cb)
  }

  async.forEachSeries(Object.keys(grouped), markAsDeleted, cb)
}

Photo.getUncheckedListings((err, listings) => {
  if (err) {
    console.log(err)
    process.exit()
  }

  if (listings.length < 1)
    process.exit()

  listings.forEach(l => grouped[l] = [])

  options.query = '(Table_MUI=' + listings.join(',') + ')'

  Client.work(options, (err) => {
    if (err && err === 'No data was fetched')
      return processData([], process.exit)

    if (err)
      console.log(err)

    process.exit()
  })
})
