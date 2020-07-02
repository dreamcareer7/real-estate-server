const db = require('../../utils/db')
const { expect } = require('../../utils/validator')

const get = async id => {
  const addresses = await getAll([id])

  if (addresses.length < 1)
    throw Error.ResourceNotFound(`Address ${id} not found`)

  return addresses[0]
}

const getAll = async ids => {
  expect(ids).to.be.a('array')

  const { rows } = await db.query.promise('address/get', [ids])

  const addresses = rows.map(r => {
    if (r.location) {
      const location = JSON.parse(r.location)

      r.location = {
        longitude: location.coordinates[0],
        latitude: location.coordinates[1],
        type: 'location'
      }
    }

    return r
  })

  return addresses
}

const getGeocodingSearchString = function (address) {
  let standard = ''
  standard += (address.street_number) ? (' ' + address.street_number + ' ') : ''
  standard += (address.street_dir_prefix) ? (' ' + address.street_dir_prefix + ' ') : ''
  standard += (address.street_name) ? (' ' + address.street_name) : ''
  standard += (address.street_suffix) ? (' ' + address.street_suffix) : ''
  standard += (address.street_dir_suffix) ? (' ' + address.street_dir_suffix + ', ') : ', '
  standard += (address.city) ? (address.city + ', ') : ''
  standard += (address.state_code) ? (' ' + address.state_code + ' ') : ''
  standard += (address.postal_code) ? (' ' + address.postal_code + ' ') : ''
  standard = standard.trim()
  standard = standard.replace(/\s\s+/g, ' ')

  return standard
}

const getLocalized = function (address) {
  let standard = ''
  standard += (address.street_number) ? (' ' + address.street_number + ' ') : ''
  standard += (address.street_dir_prefix) ? (' ' + address.street_dir_prefix + ' ') : ''
  standard += (address.street_name) ? (' ' + address.street_name) : ''
  standard += (address.street_suffix) ? (' ' + address.street_suffix) : ''
  standard += (address.street_dir_suffix) ? (' ' + address.street_dir_suffix) : ''
  standard += (address.unit_number) ? (', Unit ' + address.unit_number) : ''

  standard = standard.trim()
  standard = standard.replace(/\s\s+/g, ' ')

  return standard
}

const getBatchOfAddressesWithoutLatLongGoogle = function (limit, cb) {
  db.query('address/batch_latlong_google', [limit], function (err, res) {
    if (err)
      return cb(err)

    const address_ids = res.rows.map(function (r) {
      return r.id
    })

    return cb(null, address_ids)
  })
}

const getBatchOfAddressesWithoutLatLongBing = function (limit, cb) {
  db.query('address/batch_latlong_bing', [limit], function (err, res) {
    if (err)
      return cb(err)

    const address_ids = res.rows.map(function (r) {
      return r.id
    })

    return cb(null, address_ids)
  })
}

const getGeomTextFromLocationArray = function (array) {
  let points = array.map(function (r) {
    return (r.longitude + ' ' + r.latitude)
  })

  points = 'POLYGON((' + points.join(',') + '))'

  return points
}

module.exports = {
  get,
  getAll,
  getLocalized,
  getGeocodingSearchString,
  getGeomTextFromLocationArray,
  getBatchOfAddressesWithoutLatLongGoogle,
  getBatchOfAddressesWithoutLatLongBing,

}
