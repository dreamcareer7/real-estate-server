const async = require('async')
const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const ObjectUtil = require('../ObjectUtil')
const { EmailVerification, PhoneVerification } = require('../Verification')

const { getByPhoneNumber, getByEmail } = require('./get')

const schema_patch = {
  type: 'object',
  properties: {
    password: {
      type: ['string', null],
      required: false,
    },

    first_name: {
      type: 'string',
      required: true,
    },

    last_name: {
      type: 'string',
      required: true,
    },

    email: {
      type: ['string', null],
      format: 'email',
      required: false,
    },

    phone_number: {
      type: ['string', null],
      phone: true,
      required: false,
    },

    user_type: {
      type: 'string',
      required: true,
      enum: ['Client', 'Agent', 'Brokerage', 'Admin'],
    },

    email_signature: {
      type: ['string', 'null'],
      required: false,
    },

    website: {
      type: ['string', 'null'],
      required: false,
    },

    instagram: {
      type: ['string', 'null'],
      required: false,
    },

    twitter: {
      type: ['string', 'null'],
      required: false,
    },

    linkedin: {
      type: ['string', 'null'],
      required: false,
    },

    youtube: {
      type: ['string', 'null'],
      required: false,
    },

    facebook: {
      type: ['string', 'null'],
      required: false,
    },

    tiktok: {
      type: ['string', 'null'],
      required: false,
    }
  },
}

const validate_patch = validator.bind(null, schema_patch)

/**
 * Updates a `user` object from database
 * @param {UUID} user_id - ID of the user being updated
 * @param {IUserInput} user - full user object
 * @param {Callback<any>} cb - callback function
 */
function update(user_id, user, cb) {
  db.query(
    'user/update',
    [
      user.first_name,
      user.last_name,
      user.email,
      user.phone_number,
      user.profile_image_url,
      user.cover_image_url,
      user.brand,
      user.is_shadow,
      user.email_signature,
      user.daily_enabled,
      user.website,
      user.instagram,
      user.twitter,
      user.linkedin,
      user.youtube,
      user.facebook,
      user.tiktok,
      user_id,
    ],
    cb
  )
}

/**
 * Patches a `user` object with new data
 * @param {UUID} user_id - ID of the user being patched
 * @param {IUserInput} user - full user object
 * @param {Callback<any>} cb - callback function
 */
const patch = function (user_id, user, cb) {
  /**
   * @param {Callback<IUser>} cb
   */
  const email_owner = (cb) => {
    if (!user.email) return cb()

    getByEmail(user.email).nodeify((err, email_owner) => {
      if (err) return cb(err)

      if (email_owner && email_owner.id !== user_id) {
        return cb(Error.Conflict('Provided email is already associated with another user'))
      }

      cb(null, email_owner)
    })
  }

  /**
   * @param {Callback<IUser>} cb
   */
  const phone_owner = (cb) => {
    if (!user.phone_number) return cb()

    /** @type {string} */
    const phone_number = ObjectUtil.formatPhoneNumberForDialing(user.phone_number)

    getByPhoneNumber(phone_number).nodeify((err, phone_owner) => {
      if (err) return cb(err)

      if (phone_owner && phone_owner.id !== user_id)
        return cb(Error.Conflict('Provided phone number is already associated with another user'))

      cb(null, phone_owner)
    })
  }

  /**
   * @param {Callback<UUID>} cb
   * @param {{email_owner?: IUser}} results
   */
  const email_verification = (cb, results) => {
    if (!user.email) return cb()

    if (results.email_owner && results.email_owner.id === user_id) return cb() // Email address not changed.

    EmailVerification.create(user_id, cb)
  }

  /**
   * @param {Callback<UUID>} cb
   * @param {{phone_owner?: IUser}} results
   */
  const phone_verification = (cb, results) => {
    if (!user.phone_number) return cb()

    if (results.phone_owner && results.phone_owner.id === user_id) return cb() // Phone number has changed

    PhoneVerification.create(user_id, cb)
  }

  if (user.phone_number) user.phone_number = ObjectUtil.formatPhoneNumberForDialing(user.phone_number)

  async.auto(
    {
      validate: (cb) => validate_patch(user, cb),
      email_owner: email_owner,
      phone_owner: phone_owner,
      update: ['validate', 'email_owner', 'phone_owner', (cb) => update(user_id, user, cb)],
      email_verification: ['update', email_verification],
      phone_verification: ['update', phone_verification],
    },
    cb
  )
}

/**
 * Updates a time zone information for a user
 * @param {UUID} user_id - ID of the referenced user
 * @param {string} timezone - new time zone string representation
 */
const patchTimeZone = function (user_id, timezone) {
  return db.update('user/patch_timezone', [user_id, timezone])
}

const patchAvatars = function (user_id, type, link, cb) {
  if (type !== 'Profile' && type !== 'Cover') return cb(Error.Validation('Invalid patch type'))

  return db.query('user/patch_avatars', [user_id, type, link], cb)
}

module.exports = {
  patch,
  patchAvatars,
  patchTimeZone,
}
