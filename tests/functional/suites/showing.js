const merge = require('deepmerge')

registerSuite('brand', ['createParent', 'attributeDefs', 'createBrandLists', 'create', 'addRole', 'addMember'])

registerSuite('user', ['create', 'upgradeToAgentWithEmail', 'markAsNonShadow'])
registerSuite('listing', ['getListing'])

function _create(description, override, cb) {
  /** @type {import("../../../lib/models/Showing/showing/types").ShowingInput} */
  const showing = {
    approval_type: 'All',
    availabilities: [
      {
        weekday: 'Monday',
        availability: [7 * 60, 10 * 60],
      },
    ],
    duration: 15 * 60,
    roles: [
      {
        brand: results.brand.create.data.id,
        can_approve: true,
        role: 'SellerAgent',
        cancel_notification_type: ['email'],
        confirm_notification_type: ['push', 'email'],
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@doe.com',
        phone_number: '+15551523652',
        user: results.authorize.token.data.id,
      },
    ],
    start_date: new Date().toISOString(),
    listing: results.listing.getListing.data.id,
    notice_period: 3 * 3600,
  }

  return frisby
    .create(description)
    .post('/showings?associations[]=showing.roles&associations[]=showing.availabilities', merge(showing, override))
    .addHeader('X-RECHAT-BRAND', results.brand.create.data.id)
    .addHeader('x-handle-jobs', 'yes')
    .after(cb)
}

function create(cb) {
  return _create('create a showing', {}, function (err, res, json) {
    const setup = frisby.globalSetup()

    setup.request.headers['X-RECHAT-BRAND'] = results.brand.create.data.id
    setup.request.headers['x-handle-jobs'] = 'yes'

    frisby.globalSetup(setup)

    cb(err, res, json)
  })
    .expectStatus(200)
    .expectJSON({
      data: {},
    })
}

function createWithValidationError(cb) {
  return _create(
    'create a showing with invalid data',
    {
      availabilities: [
        {
          weekday: 'Monday',
          availability: [7 * 60, 10 * 60],
        },
        {
          weekday: 'Monday',
          availability: [7 * 60, 10 * 60],
        },
      ],
    },
    cb
  ).expectStatus(400)
}

module.exports = {
  create,
  createWithValidationError,
}
