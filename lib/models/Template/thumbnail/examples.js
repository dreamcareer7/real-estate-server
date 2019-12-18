const listing  = require('./listing.json')
const listing2 = require('./listing-2.json')
const listing3 = require('./listing-3.json')

const listings = [listing, listing2, listing3]

const user = require('./user.json')
const contact = require('./contact.json')
const crmopenhouse = require('./crmopenhouse.json')

module.exports = {
  listing,
  listings,
  user,
  contact,
  crmopenhouse
}