#!/usr/bin/env node
const Client = require('./rets_client.js')
const async = require('async')

const program = require('./program.js')
const options = program.parse(process.argv)

options.resource = 'PropertySubTable'
options.class = 'Room'
options.job = 'rooms'
options.fields = {
  id: 'matrix_unique_id'
}
options.processor = processData

Client.work(options, report)

function processData (cb, results) {
  async.forEach(results.mls, insert, cb)
}

function map (mls_room) {
  return {
    matrix_unique_id: parseInt(mls_room.matrix_unique_id),
    matrix_modified_dt: mls_room.MatrixModifiedDT,
    description: mls_room.RoomDescription,
    length: parseInt(mls_room.RoomLength) || null,
    width: parseInt(mls_room.RoomWidth) || null,
    listing_mui: mls_room.Listing_MUI,
    features: mls_room.RoomFeatures,
    level: parseInt(mls_room.RoomLevel) || null,
    room_type: mls_room.RoomType
  }
}

const insert = function (room, cb) {
  Metric.increment('mls.processed_room')
  PropertyRoom.create(map(room), cb)
}

function report (err) {
  if (err)
    console.log(err)

  process.exit()
}
