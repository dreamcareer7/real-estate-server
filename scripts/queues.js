require('../lib/models/index.js')()
const config = require('../lib/config')

const airship = (job, done) => {
  Notification.sendToDevice(job.data.notification, job.data.token, job.data.user_id, done)
}

const notification = (job, done) => {
  Notification.create(job.data.notification, done)
}

const email = (job, done) => {
  Mailgun.callMailgun(job.data, done)
}

const email_sane = (job, done) => {
  Email.sendSane(job.data, done)
}

const ses = (job, done) => {
  SES.callSES(job.data, done)
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

module.exports = {
  airship_transport_send_device: {
    handler: airship,
    parallel: config.airship.parallel
  },

  create_notification: {
    handler: notification,
    parallel: 1
  },

  email: {
    handler: email,
    parallel: config.email.parallel
  },

  email_sane: {
    handler: email_sane,
    parallel: config.email.parallel
  },

  email_ses: {
    handler: ses,
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
    parallel: 10
  },

  'MLS.Room': {
    handler: mls_room,
    parallel: 10
  },

  'MLS.OpenHouse': {
    handler: mls_openhouse,
    parallel: 10
  },

  'MLS.Agent': {
    handler: mls_agent,
    parallel: 10
  },

  'MLS.Office': {
    handler: mls_office,
    parallel: 10
  },

  'MLS.Photo': {
    handler: mls_photo,
    parallel: 100
  },

  'MLS.Listing': {
    handler: mls_listing,
    parallel: 10
  },

  'MLS.Listing.Photos.Validate': {
    handler: mls_validate_listing_photos,
    parallel: 10
  }
}