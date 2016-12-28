/**
 * @namespace Contact
 */

const validator = require('../utils/validator.js')
const db = require('../utils/db.js')
const async = require('async')
const _u = require('underscore')
const expect = validator.expect

Contact = {}
Orm.register('contact', Contact)

const schema = {
  type: 'object',
  properties: {
    user: {
      uuid: true,
      type: 'string',
      required: true
    },

    contact: {
      uuid: true,
      type: 'string',
      required: false
    },

    first_name: {
      type: 'string',
      required: false
    },

    last_name: {
      type: 'string',
      required: false
    },

    phone_number: {
      type: 'string',
      required: false,
      phone: true
    },

    email: {
      type: 'string',
      format: 'email',
      maxLength: 100,
      required: false
    },

    cover_image_url: {
      type: 'string',
      required: false
    },

    profile_image_url: {
      type: 'string',
      required: false
    },

    invitation_url: {
      type: 'string',
      required: false
    },

    company: {
      type: 'string',
      required: false
    },

    address: {
      type: 'object',
      required: false
    },

    birthday: {
      type: 'number',
      required: false
    },

    source_type: {
      type: 'string',
      required: false,
      enum: [
        'BrokerageWidget',
        'IOSAddressBook',
        'SharesRoom',
        'ExplicitlyCreated'
      ]
    },

    brand: {
      type: [ null, 'string' ],
      uuid: true,
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

function getContacts (family, user_id, paging, cb) {
  db.query(family, [user_id, paging.type, paging.timestamp, paging.limit], function (err, res) {
    if (err)
      return cb(err)

    const contact_ids = res.rows.map(function (r) {
      return r.id
    })

    async.map(contact_ids, Contact.get, function (err, contacts) {
      if (err)
        return cb(err)

      return cb(null, contacts)
    })
  })
}

Contact.extractNameInfo = function(contact) {
  let names = []
  let emails = []
  let phone_numbers = []

  if(contact.attributes && contact.attributes.name)
    names.concat(contact.attributes.name)

  if(contact.emails)
    emails.concat(contact.emails)

  if(contact.phone_numbers)
    phone_numbers.cocat(contact.phone_numbers)

  if(contact.sub_contacts) {
    contact.sub_contacts.map(c => {
      console.log(c)
      if(c.attributes && c.attributes.name)
        names.concat(c.attributes.name)

      if(c.emails)
        emails.concat(c.emails)

      if(c.phone_numbers)
        phone_numbers.concat(c.phone_numbers)

      return false
    })
  }

  names = _u.chain(_u.sortBy(names, r => r.updated_at)).reverse().value()
  emails = _u.chain(_u.sortBy(emails, r => r.updated_at)).reverse().value()
  phone_numbers = _u.chain(_u.sortBy(phone_numbers, r => r.updated_at)).reverse().value()

  const candidate_name = names[0] || {}
  const candidate_email = emails[0]
  const candidate_phone_number = phone_numbers[0]

  console.log(names, emails, phone_numbers)

  return [candidate_name.first_name, candidate_name.last_name, candidate_email, candidate_phone_number]
}

Contact.getDisplayName = function (contact) {
  const [first_name, last_name, email, phone_number] = Contact.extractNameInfo(contact)

  if (!_u.isEmpty(first_name) && !_u.isEmpty(last_name))
    return first_name + ' ' + last_name

  if (!_u.isEmpty(email))
    return email

  if (!_u.isEmpty(phone_number))
    return phone_number

  return 'Guest'
}

Contact.getAbbreviatedDisplayName = function (contact) {
  const [first_name, , email, phone_number] = Contact.extractNameInfo(contact)

  if (!_u.isEmpty(first_name))
    return first_name

  if (!_u.isEmpty(email))
    return email

  if (!_u.isEmpty(phone_number))
    return phone_number

  return 'Guest'
}

Contact.getForUser = function (user_id, paging, cb) {
  getContacts('contact/user', user_id, paging, cb)
}

Contact.get = function (contact_id, cb) {
  db.query('contact/get', [contact_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Contact not found'))

    const contact = res.rows[0]
    contact.display_name = Contact.getDisplayName(contact)
    contact.abbreviated_display_name = Contact.getAbbreviatedDisplayName(contact)

    return cb(null, contact)
  })
}

Contact.isDup = function (user_id, contact, cb) {
  db.query('contact/is_dup', [user_id, contact.contact_user, contact.email, contact.phone_number], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows[0].is_dup)
  })
}

Contact.add = function (user_id, contact, cb) {
  let p = contact.phone_numbers
  let malformed = false

  if(!p)
    p = []

  contact.phone_numbers = p.map(r => {
    r = ObjectUtil.cleanPhoneNumber(r)

    try {
      const formatted = ObjectUtil.formatPhoneNumberForDialing(r)

      if(!formatted)
        malformed = true

      return formatted
    } catch (err) {
      malformed = true

      return null
    }
  })

  if (malformed)
    return cb(Error.Validation('Not a valid phone number'))

  async.auto({
    validate: (cb, results) => {
      validate(contact, cb)
    },
    dup: [
      'validate',
      (cb, results) => {
        return Contact.isDup(user_id, contact, cb)
      }
    ],
    create: [
      'validate',
      (cb, results) => {
        db.query('contact/add', [
          user_id,
        ], (err, res) => {
          if (err)
            return cb(err)

          return cb(null, res.rows[0].id)
        })
      }
    ],
    add_tag: [
      'validate',
      'create',
      (cb, results) => {
        if (results.create && contact.tags)
          return Contact.addTags(results.create, contact.tags, user_id, cb)

        return cb()
      }
    ],
    emails: [
      'validate',
      'create',
      (cb, results) => {
        if (results.create && contact.emails) {
          return async.map(contact.emails, (r, cb) => {
            Contact.addAttribute(results.create, user_id, 'email', r, cb)
          }, cb)
        }

        return cb()
      }
    ],
    phone_numbers: [
      'validate',
      'create',
      (cb, results) => {
        if (results.create && contact.phone_numbers) {
          return async.map(contact.phone_numbers, (r, cb) => {
            Contact.addAttribute(results.create, user_id, 'phone_numbers', r, cb)
          }, cb)
        }

        return cb()
      }
    ],
    attributes: [
      'validate',
      'create',
      (cb, results) => {
        const attributes = contact.attributes

        if (!attributes)
          return cb()

        expect(attributes).to.be.a('object')

        if (results.create) {
          return async.map(Object.keys(attributes), (key, cb) => {
            expect(attributes[key]).to.be.a('array')

            async.map(attributes[key], (r, cb) => {
              Contact.addAttribute(results.create, user_id, r.type, r, cb)
            }, cb)
          }, cb)
        }

        return cb()
      }
    ],
    get: [
      'validate',
      'create',
      'emails',
      'phone_numbers',
      'attributes',
      (cb, results) => {
        if (results.create) {
          Contact.get(results.create, (err, data) => {
            if (err)
              return cb(err)

            data.device_contact_id = contact.device_contact_id
            return cb(null, data)
          })
        } else {
          return cb()
        }
      }
    ],
    notification: [
      'create',
      'get',
      (cb, results) => {
        if (!results.get)
          return cb()

        if (!results.get.id || contact.source_type === 'ExplicitlyCreated')
          return cb()

        return cb()
        // const notification = {}
        //
        // notification.action = 'CreatedFor'
        // notification.subject = results.get.id
        // notification.subject_class = 'Contact'
        // notification.object = results.get.user
        // notification.object_class = 'User'
        // notification.message = 'You have a new contact.'
        //
        // return Notification.issueForUser(notification, user_id, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.get)
  })
}

Contact.delete = function (contact_id, cb) {
  db.query('contact/delete', [contact_id], cb)
}

Contact.patchAttribute = function (contact_id, user_id, attribute_id, attribute_type, attribute, cb) {
  expect(attribute).to.be.a('object')
  expect(attribute_type).to.be.a('string')

  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        if(contact.user !== user_id)
          return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

        return cb()
      })
    },
    email: [
      'check',
      cb => {
        if(attribute_type !== 'email')
          return cb()

        expect(attribute.email).to.be.a('string')
        const email = attribute.email
        delete attribute.email

        return db.query('contact/update_email', [
          contact_id,
          attribute_id,
          email,
          attribute,
        ], cb)
      }
    ],
    phone_number: [
      'check',
      cb => {
        if(attribute_type !== 'phone_number')
          return cb()

        expect(attribute.phone_number).to.be.a('string')
        const phone_number = attribute.phone_number
        delete attribute.phone_number

        return db.query('contact/update_phone_number', [
          contact_id,
          attribute_id,
          phone_number,
          attribute,
        ], cb)
      }
    ],
    other: [
      'check',
      cb => {
        if(attribute_type === 'phone_number' || attribute_type === 'email')
          return cb()

        return db.query('contact/update_attribute', [
          contact_id,
          attribute_id,
          attribute_type,
          attribute,
        ], cb)
      }
    ],
    get: [
      'check',
      'email',
      'phone_number',
      'other',
      cb => {
        Contact.get(contact_id, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.get)
  })
}

Contact.addAttribute = function (contact_id, user_id, attribute_type, attribute, cb) {
  expect(attribute).to.be.a('object')
  expect(attribute_type).to.be.a('string')

  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        if(contact.user !== user_id)
          return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

        return cb()
      })
    },
    email: [
      'check',
      cb => {
        if(attribute_type !== 'email')
          return cb()

        expect(attribute.email).to.be.a('string')
        const email = attribute.email
        delete attribute.email

        return db.query('contact/add_email', [
          contact_id,
          email,
          attribute,
        ], cb)
      }
    ],
    phone_number: [
      'check',
      cb => {
        if(attribute_type !== 'phone_number')
          return cb()

        expect(attribute.phone_number).to.be.a('string')
        const phone_number = attribute.phone_number
        delete attribute.phone_number

        return db.query('contact/add_phone_number', [
          contact_id,
          phone_number,
          attribute,
        ], cb)
      }
    ],
    other: [
      'check',
      cb => {
        if(attribute_type === 'phone_number' || attribute_type === 'email')
          return cb()

        return db.query('contact/add_attribute', [
          contact_id,
          attribute_type,
          attribute,
        ], cb)
      }
    ],
    get: [
      'check',
      'email',
      'phone_number',
      'other',
      cb => {
        Contact.get(contact_id, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.get)
  })
}

Contact.getAttribute = function(contact_id, user_id, attribute_id, attribute_type, cb) {
  expect(attribute_type).to.be.a('string')

  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        if(contact.user !== user_id)
          return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

        return cb()
      })
    },
    email: [
      'check',
      cb => {
        if(attribute_type !== 'email')
          return cb()

        db.query('contact/get_email', [contact_id, attribute_id], cb)
      }
    ],
    phone_number: [
      'check',
      cb => {
        if(attribute_type !== 'phone_number')
          return cb()

        db.query('contact/get_phone_number', [contact_id, attribute_id], cb)
      }
    ],
    other: [
      'check',
      cb => {
        if(attribute_type === 'email' || attribute_type === 'phone_number')
          return cb()

        db.query('contact/get_attribute', [contact_id, attribute_id], cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    const attr = results.email || results.phone_number || results.other

    if(!attr)
      return cb(Error.ResourceNotFound('Attribute not found'))

    return cb(null, attr)
  })
}

Contact.deleteAttribute = function(contact_id, user_id, attribute_id, attribute_type, cb) {
  expect(attribute_type).to.be.a('string')

  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        if(contact.user !== user_id)
          return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

        return cb()
      })
    },
    get_attr: cb => {
      Contact.getAttribute(contact_id, user_id, attribute_id, attribute_type, cb)
    },
    delete_email: [
      'check',
      'get_attr',
      cb => {
        if (attribute_type !== 'email')
          return cb()

        db.query('contact/delete_email', [contact_id, attribute_id], cb)
      }
    ],
    delete_phone_number: [
      'check',
      'get_attr',
      cb => {
        if (attribute_type !== 'phone_number')
          return cb()

        db.query('contact/delete_phone_number', [contact_id, attribute_id], cb)
      }
    ],
    delete_other: [
      'check',
      'get_attr',
      cb => {
        if (attribute_type === 'email' || attribute_type === 'phone_number')
          return cb()

        db.query('contact/delete_attribute', [contact_id, attribute_id], cb)
      }
    ],
    get: [
      'check',
      'get_attr',
      'delete_email',
      'delete_phone_number',
      'delete_other',
      cb => {
        Contact.get(contact_id, cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb(null, results.get)
  })
}

Contact.stringSearch = function (user_id, terms, limit, cb) {
  terms = terms.map(r => {
    return '%' + r + '%'
  })

  db.query('contact/string_search', [user_id, terms, limit], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const contact_ids = res.rows.map(r => {
      return r.id
    })

    async.map(contact_ids, Contact.get, (err, contacts) => {
      if (err)
        return cb(err)

      contacts[0].total = res.rows[0].total
      return cb(null, contacts)
    })
  })
}

Contact.addTags = function (contact_id, tags, user_id, cb) {
  const insert = (contact_id, user_id, tag, cb) => {
    db.query('contact/add_tag', [contact_id, tag, user_id], cb)
  }

  async.each(tags, insert.bind(null, contact_id, user_id), cb)
}

Contact.getByTags = function (user_id, tags, cb) {
  const tag_arr = tags.split(',')

  db.query('contact/get_by_tag', ['Contact', tag_arr, user_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.legnth < 1)
      return cb(null, true)

    const contact_ids = res.rows.map(r => {
      return r.id
    })

    async.map(contact_ids, Contact.get, (err, contacts) => {
      if (err)
        return cb(err)

      return cb(null, contacts)
    })
  })
}

Contact.removeTag = function (contact_id, tag, user_id, cb) {
  db.query('contact/remove_tag', [contact_id, tag, user_id], cb)
}

Contact.removeTags = function (contact_id, user_id, cb) {
  Contact.get(contact_id, err => {
    if (err)
      return cb(err)

    return db.query('contact/remove_tags', [contact_id, user_id], cb)
  })
}

Contact.isConnected = function (user_id, peer_id, cb) {
  db.query('contact/connected', [user_id, peer_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows[0].is_connected > 0)
      return cb(null, true)

    return cb()
  })
}

Contact.connect = function (user_id, peer_id, override, cb) {
  Contact.join(user_id, peer_id, override, (err) => {
    if (err)
      return cb(err)

    Contact.join(peer_id, user_id, override, (err) => {
      if (err)
        return cb(err)

      return cb()
    })
  })
}

Contact.join = function (user_id, peer_id, override, cb) {
  Contact.isConnected(user_id, peer_id, (err, connected) => {
    if (err)
      return cb(err)

    if (connected)
      return cb()

    User.get(peer_id, (err, peer) => {
      if (err)
        return cb(err)

      const contact = {
        contact_user: peer_id,
        first_name: (peer.first_name) ? peer.first_name : undefined,
        last_name: (peer.last_name) ? peer.last_name : undefined,
        phone_number: (peer.phone_number) ? peer.phone_number : undefined,
        email: (peer.email && !peer.fake_email) ? peer.email : undefined,
        profile_image_url: (peer.profile_image_url) ? peer.profile_image_url : undefined,
        cover_image_url: (peer.cover_image_url) ? peer.cover_image_url : undefined,
        source_type: override ? override.source_type : 'SharesRoom',
        brand: override ? override.brand : null
      }

      return Contact.add(user_id, contact, cb)
    })
  })
}

Contact.publicize = function (model) {
  // Look at issue #477.
  // Basically, we alwys we opt in to user's self-defined picture.

  if (model.contact_user && model.contact_user.profile_image_url)
    model.display_profile_image_url = model.contact_user.profile_image_url || model.profile_image_url

  if (model.contact_user && model.contact_user.cover_image_url)
    model.display_cover_image_url = model.contact_user.cover_image_url || model.cover_image_url

  if (model.user) delete model.user

  return model
}

Contact.associations = {
  users: {
    collection: true,
    optional: true,
    model: 'User'
  },
  brands: {
    collection: true,
    optional: true,
    model: 'Brand'
  }
}

module.exports = function () {

}
