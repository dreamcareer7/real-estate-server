require('../lib/models/index.js')()
const config = require('../lib/config')

const airship = (job, done) => {
  Notification.sendToDevice(job.data.notification, job.data.token, job.data.user_id, done)
}

const notification = (job, done) => {
  Notification.create(job.data.notification, done)
}

const email_sane = (job, done) => {
  Email.sendSane(job.data, done)
}

const sms = (job, done) => {
  Twilio.callTwilio(job.data, done)
}

const saveLastSeen = (job, done) => {
  User.saveLastSeen(job.data, done)
}

const mls_unit = (job, done) => {
  PropertyUnit.create(job.data.processed, done)
}

const mls_openhouse = (job, done) => {
  OpenHouse.create(job.data.processed, done)
}

const mls_room = (job, done) => {
  PropertyRoom.create(job.data.processed, done)
}

const mls_agent = (job, done) => {
  Agent.create(job.data.processed, done)
}

const mls_office = (job, done) => {
  Office.create(job.data.processed, done)
}

const mls_photo = (job, done) => {
  Photo.create(job.data.processed, done)
}

const mls_listing = (job, done) => {
  Listing.create(job.data.processed, done)
}

const mls_validate_listing_photos = (job, done) => {
  Photo.deleteMissing(job.data.listing, job.data.present, done)
}

const sync_brokerwolf = (job, done) => {
  Deal.get(job.data.id, (err, deal) => {
    if (err)
      return done(err)

    Deal.BrokerWolf.sync(deal).nodeify(done)
  })
}

const deal_email = (job, done) => {
  Deal.Email.accept(job.data.incoming).nodeify(done)
}

module.exports = {
  airship_transport_send_device: {
    handler: airship,
    parallel: config.airship.parallel
  },

  create_notification: {
    handler: notification,
    parallel: 50
  },

  email_sane: {
    handler: email_sane,
    parallel: config.email.parallel
  },

  sms: {
    handler: sms,
    parallel: config.twilio.parallel
  },

  save_last_seen: {
    handler: saveLastSeen,
    parallel: 5
  },

  'MLS.Unit': {
    handler: mls_unit,
    parallel: 50
  },

  'MLS.Room': {
    handler: mls_room,
    parallel: 50
  },

  'MLS.OpenHouse': {
    handler: mls_openhouse,
    parallel: 50
  },

  'MLS.Agent': {
    handler: mls_agent,
    parallel: 50
  },

  'MLS.Office': {
    handler: mls_office,
    parallel: 50
  },

  'MLS.Photo': {
    handler: mls_photo,
    parallel: 50
  },

  'MLS.Listing': {
    handler: mls_listing,
    parallel: 50
  },

  'MLS.Listing.Photos.Validate': {
    handler: mls_validate_listing_photos,
    parallel: 50
  },

  'sync_brokerwolf': {
    handler: sync_brokerwolf,
    parallel: 1
  },

  'deal_email': {
    handler: deal_email,
    parallel: 5
  }
}