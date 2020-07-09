const Brand = require('../Brand')
const Branch = require('../Branch')
const Url = require('../Url')

const {
  getType
} = require('./get')

const getBranchLink = function(notification, user, room_id, cb) {
  const type = getType(notification)

  if(type !== 'UserCreatedAlert' && type !== 'UserSharedListing')
    return cb() // Only these three notifications have specific branch links for now

  const b = {}

  if(type === 'UserSharedListing') {
    b.listing = notification.object
    b.action = 'RedirectToListing'
  } else if (type === 'UserCreatedAlert') {
    b.alert = notification.object
    b.action = 'RedirectToAlert'
  }

  const getBrand = cb => {
    if (!user.brand)
      return cb()

    Brand.get(user.brand).nodeify(cb)
  }

  getBrand((err, brand) => {
    if (err)
      return cb(err)

    const url = Url.web({
      uri: '/branch',
      brand
    })

    b.room = room_id || notification.room || undefined
    b.sending_user = notification.subject
    b.receiving_user = user.id
    b.token = user.secondary_password
    b.email = user.email

    if (user.phone_number)
      b.phone_number = user.phone_number

    b['$desktop_url'] = url
    b['$fallback_url'] = url

    Branch.createURL(b).nodeify(cb)
  })
}

const getBranchType = n => (getType(n) === 'UserCreatedAlert' || getType(n) === 'UserSharedListing') ? 'Resource' : 'Room'

module.exports = {
  getBranchLink,
  getBranchType
}
