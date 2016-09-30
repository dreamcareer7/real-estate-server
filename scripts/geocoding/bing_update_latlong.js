require('../connection.js')

const async = require('async')
const config = require('../../lib/config.js')
const sleep = require('sleep')

Address.getBatchOfAddressesWithoutLatLongBing(config.bing.address_batch_size, function (err, address_ids) {
  if (err) {
    console.log(err)
    process.exit(1)
  }

  const startTime = (new Date()).getTime()
  async.mapLimit(address_ids,
                 config.bing.concurrency,
                 function (r, cb) {
                   return Address.updateGeoFromBing(r, cb)
                 },
                 function (err, results) {
                   if (err) {
                     console.log(err)
                     return
                   }

                   const endTime = (new Date()).getTime()
                   const elapsed = (endTime - startTime) / 1000
                   const remaining = parseInt(config.bing.pause - elapsed)

                   results = results.filter(Boolean)
                   async.map(results, Address.reschedule, function (err, ok) {
                     if (err)
                       console.log('Error rescheduling addresses')

                     if (remaining > 0) {
                       console.log('Pausing for'.yellow,
                                   remaining,
                                   'seconds before termination to meet Bing\'s limit on daily requests...'.yellow)
                       sleep.sleep(remaining)
                       process.exit(0)
                     } else {
                       process.exit(0)
                     }
                   })
                 })
})
