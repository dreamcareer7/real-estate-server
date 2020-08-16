const async = require('async')
const Branch = require('../Branch')
const Brand = require('../Brand/get')
const Url = require('../Url')

const {
  get: getUser
} = require('../User/get')

const getBranchLink = function({user_id, room_id, fallback}, cb) {
  const getBrand = (cb, results) => {
    if (!results.user.brand)
      return cb()

    Brand.get(results.user.brand).nodeify(cb)
  }

  const build = (err, results) => {
    if (err)
      return cb(err)

    const url = Url.web({
      uri: '/branch',
      brand: results.brand
    })

    const b = {}
    b.room = room_id
    b.action = 'RedirectToRoom'
    b.receiving_user = results.user.id
    b.token = results.user.secondary_password
    b.email = results.user.email

    if (results.user.phone_number)
      b.phone_number = results.user.phone_number

    b['$desktop_url'] = url

    //By default, fallback is enabled. so being null means its enabled. Disable it only if its false.
    if (fallback !== false)
      b['$fallback_url'] = url

    Branch.createURL(b).nodeify(cb)
  }

  async.auto({
    user: cb => getUser(user_id).nodeify(cb),
    brand: ['user', getBrand],
  }, build)
}

module.exports = {
  getBranchLink
}
