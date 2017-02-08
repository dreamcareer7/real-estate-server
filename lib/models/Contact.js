/**
 * @namespace Contact
 */

const validator = require('../utils/validator.js')
const db = require('../utils/db.js')
const async = require('async')
const _u = require('underscore')
const pluralize = require('pluralize')
const expect = validator.expect

Contact = {}
Tag = {}

Orm.register('contact', Contact)
Orm.register('tag', Tag)

const schema = {
  type: 'object',
  properties: {

  }
}

const validate = validator.bind(null, schema)

function getContacts (family, user_id, paging, cb) {
  db.query(family, [user_id, paging.type, paging.timestamp, paging.limit], (err, res) => {
    if (err)
      return cb(err)

    const contact_ids = res.rows.map(r => r.id)

    async.map(contact_ids, Contact.get, (err, contacts) => {
      if (err)
        return cb(err)

      if (contacts[0])
        contacts[0].total = res.rows[0].total

      return cb(null, contacts)
    })
  })
}

Contact.extractNameInfo = function(contact) {
  let names = []
  let emails = []
  let phone_numbers = []

  if(contact.sub_contacts) {
    contact.sub_contacts.map(c => {
      if(c.attributes) {
        if(c.attributes.names)
          names = names.concat(c.attributes.names)

        if(c.attributes.emails)
          emails = emails.concat(c.attributes.emails)

        if(c.attributes.phone_numbers)
          phone_numbers = phone_numbers.concat(c.attributes.phone_numbers)
      }

      return false
    })
  }

  names = _u.chain(_u.sortBy(names, r => r.updated_at)).reverse().value()
  emails = _u.chain(_u.sortBy(emails, r => r.updated_at)).reverse().value()
  phone_numbers = _u.chain(_u.sortBy(phone_numbers, r => r.updated_at)).reverse().value()

  const candidate_name = names[0] || {}
  const candidate_email = emails[0] || {}
  const candidate_phone_number = phone_numbers[0] || {}

  return [
    candidate_name.first_name,
    candidate_name.last_name,
    candidate_email.email,
    candidate_phone_number.phone_number
  ]
}

Contact.getDisplayName = function(contact) {
  const [first_name, last_name, email, phone_number] = Contact.extractNameInfo(contact)

  if (!_u.isEmpty(first_name) && !_u.isEmpty(last_name))
    return first_name + ' ' + last_name

  if (!_u.isEmpty(first_name))
    return first_name

  if (!_u.isEmpty(last_name))
    return last_name

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
    if(contact.sub_contacts) {
      contact.sub_contacts.map(r => {
        if(!r.attributes)
          r.attributes = {}

        Object.keys(r.attributes).map(k => {
          r.attributes[pluralize(k)] = r.attributes[k]
          delete r.attributes[k]
        })

        r.attributes.type = 'attributes'

        if(r.phone_numbers) {
          r.attributes.phone_numbers = r.phone_numbers

          delete r.phone_numbers
        }

        if(r.emails) {
          r.attributes.emails = r.emails

          delete r.emails
        }

        if (Object.keys(r.attributes).length === 0)
          delete r.attributes
      })
    }

    contact.display_name = Contact.getDisplayName(contact)
    contact.abbreviated_display_name = Contact.getAbbreviatedDisplayName(contact)

    return cb(null, contact)
  })
}

Contact.add = function (user_id, contact, cb) {
  const attributes = contact.attributes ? contact.attributes : {}

  async.auto({
    validate: (cb, results) => {
      validate(contact, cb)
    },
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
    refs: [
      'create',
      (cb, results) => {
        Contact.setRefs(results.create, [results.create], cb)
      }
    ],
    emails: [
      'validate',
      'create',
      (cb, results) => {
        if (!attributes.emails)
          return cb()

        if (results.create) {
          return async.map(attributes.emails, (r, cb) => {
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
        if (!attributes.phone_numbers)
          return cb()

        if (results.create) {
          return async.map(attributes.phone_numbers, (r, cb) => {
            Contact.addAttribute(results.create, user_id, 'phone_number', r, cb)
          }, cb)
        }

        return cb()
      }
    ],
    attributes: [
      'validate',
      'create',
      (cb, results) => {
        if (!attributes)
          return cb()

        expect(attributes).to.be.a('object')

        const keys = _u.without(Object.keys(attributes), 'phone_numbers', 'emails')

        if (results.create) {
          return async.map(keys, (key, cb) => {
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
      'refs',
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
  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attribute_id).to.be.a('string')
  expect(attribute_type).to.be.a('string')
  expect(attribute).to.be.a('object')

  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        // if(contact.user !== user_id)
        //   return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

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
        let phone_number = attribute.phone_number
        const _p = phone_number
        delete attribute.phone_number

        phone_number = ObjectUtil.cleanPhoneNumber(phone_number)

        try {
          phone_number = ObjectUtil.formatPhoneNumberForDialing(phone_number)
        }
        catch (err) {
          return cb(err)
        }

        if (!phone_number)
          return cb(Error.Validation(`${_p} is not a valid phone number`))

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
    validate: cb => {
      const def = validator.types.contact.attributes[attribute_type]

      if (!def)
        return cb(Error.Validation(`${attribute_type} is not a known attribute type`))

      validator(def, attribute, cb)
    },
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        // if(contact.user !== user_id)
        //   return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

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
        let phone_number = attribute.phone_number
        const _p = phone_number
        delete attribute.phone_number

        phone_number = ObjectUtil.cleanPhoneNumber(phone_number)

        try {
          phone_number = ObjectUtil.formatPhoneNumberForDialing(phone_number)
        }
        catch (err) {
          return cb(err)
        }

        if (!phone_number)
          return cb(Error.Validation(`${_p} is not a valid phone number`))

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

Contact.setRefs = function(contact_id, refs, cb) {
  db.query('contact/set_refs', [contact_id, refs], cb)
}

Contact.getAttribute = function(contact_id, user_id, attribute_id, cb) {
  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        // if(contact.user !== user_id)
        //   return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

        return cb()
      })
    },
    email: [
      'check',
      cb => {
        db.query('contact/get_email', [contact_id, attribute_id], cb)
      }
    ],
    phone_number: [
      'check',
      cb => {
        db.query('contact/get_phone_number', [contact_id, attribute_id], cb)
      }
    ],
    other: [
      'check',
      cb => {
        db.query('contact/get_attribute', [contact_id, attribute_id], cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    const email = results.email.rows
    const phone_number = results.phone_number.rows
    const other = results.other.rows
    const attr = email.length > 0 ? email[0] : (phone_number.length > 0 ? phone_number[0] : (other.length > 0 ? other[0] : undefined))

    if(!attr)
      return cb(Error.ResourceNotFound(`Attribute ${attribute_id} not found for this contact`))

    return cb(null, attr)
  })
}

Contact.deleteAttribute = function(contact_id, user_id, attribute_id, cb) {
  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attribute_id).to.be.uuid

  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if(err)
          return cb(err)

        // if(contact.user !== user_id)
        //   return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))

        return cb()
      })
    },
    get_attr: cb => {
      Contact.getAttribute(contact_id, user_id, attribute_id, cb)
    },
    delete_email: [
      'check',
      'get_attr',
      cb => {
        db.query('contact/delete_email', [contact_id, attribute_id], cb)
      }
    ],
    delete_phone_number: [
      'check',
      'get_attr',
      cb => {
        db.query('contact/delete_phone_number', [contact_id, attribute_id], cb)
      }
    ],
    delete_other: [
      'check',
      'get_attr',
      cb => {
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

      if (contacts[0])
        contacts[0].total = res.rows[0].total

      return cb(null, contacts)
    })
  })
}

Contact.getByTags = function (user_id, tags, cb) {
  db.query('contact/get_by_tag', [user_id, tags], (err, res) => {
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

Contact.getAllTags = function(user_id, cb) {
  db.query('tag/get_all', [user_id], (err, res) => {
    if (err)
      return cb(err)

    if(res.rows.length < 1)
      return cb(null, [])

    let tags = res.rows.map(r => {
      return r.tag
    })

    tags = _u.unique(tags, (i, k, v) => {
      return i.tag
    })

    return cb(null, tags)
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


      const contact = Contact.convertUser(peer, override)

      return Contact.add(user_id, contact, cb)
    })
  })
}

Contact.convertUser = function(user, override) {
  const contact = {}
  contact.attributes = {}

  if(user.email && !user.fake_email) {
    contact.attributes.emails = [
      {
        type: 'email',
        email: user.email
      }
    ]
  }

  if (user.phone_number) {
    contact.attributes.phone_numbers = [
      {
        type: 'phone_number',
        phone_number: user.phone_number
      }
    ]
  }

  if(user.first_name || user.last_name) {
    contact.attributes.names = [
      {
        type: 'name',
        first_name: (user.first_name) ? user.first_name : undefined,
        last_name: (user.last_name) ? user.last_name : undefined
      }
    ]
  }

  if(user.profile_image_url) {
    contact.attributes.profile_image_urls = [
      {
        type: 'profile_image_url',
        profile_image_url: user.profile_image_url
      }
    ]
  }

  if(user.cover_image_url) {
    contact.attributes.cover_image_urls = [
      {
        type: 'cover_image_url',
        profile_image_url: user.cover_image_url
      }
    ]
  }

  contact.attributes.source_types = [
    {
      type: 'source_type',
      source_type: (override && override.source_type) ? override.source_type : 'SharesRoom'
    }
  ]

  if(override && override.brand) {
    contact.attributes.brands = [
      {
        type: 'brand',
        brand: override.brand
      }
    ]
  }

  return contact
}

Contact.publicize = function (model) {
  // Look at issue #477.
  // Basically, we alwys we opt in to user's self-defined picture.

  const user_p =
  model.users &&
  model.users[0] &&
  model.users[0].profile_image_url ?
  model.users[0].profile_image_url : undefined

  const contact_p =
  model.attributes &&
  model.attributes.profile_image_urls &&
  model.attributes.profile_image_urls[0] &&
  model.attributes.profile_image_urls[0] &&
  model.attributes.profile_image_urls[0].profile_image_url ?
  model.attributes.profile_image_urls[0].profile_image_url : undefined

  model.display_profile_image_url = user_p || contact_p || undefined

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

Tag.associations = {

}

module.exports = function () {

}
