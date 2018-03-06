/**
 * @namespace Contact
 */

const omit = require('lodash/omit')
const validator = require('../../utils/validator.js')
const promisify = require('../../utils/promisify.js')
const db = require('../../utils/db.js')
const async = require('async')
const _u = require('underscore')
const pluralize = require('pluralize')
const expect = validator.expect
const {EventEmitter} = require('events')
const pgsql = require('squel').useFlavour('postgres')
const _ = require('lodash')

Contact = new EventEmitter
Tag = {}

Orm.register('contact', 'Contact')
Orm.register('tag', 'Tag')

require('./Import')
require('./export-outlook-csv')

const schema = {
  type: 'object',
  properties: {
    ios_address_book_id: {
      type: ['string', null],
      required: false
    },
    android_address_book_id: {
      type: ['string', null],
      required: false
    }
  }
}

const validate = validator.promise.bind(null, schema)

const helpers = {}

helpers.getUpdateRefsQuery = function (contactID, queryArray) {
  queryArray.push(
    pgsql.update()
      .table('contacts')
      .set('refs', pgsql.str((`ARRAY['${contactID}']::uuid[]`)))
      .where('id = ?', contactID)
      .toString()
  )
}

helpers.getInsertEmailsQuery = async function (contact, contactID, queryArray, errored) {
  const emails = _.get(contact, 'attributes.emails', [])
  let emailIsPrimary = false
  const emailArr = []
  
  for (const e of emails) {
    const def = validator.types.contact.attributes['email']
    try {
      await promisify(validator)(def, e)
    } catch (err) {
      errored.push({
        subject: e.email,
        type: 'email',
        error: err
      })
      continue
    }
    emailArr.push({
      contact: contactID,
      email: e.email,
      is_primary: emailIsPrimary ? false : Boolean(e.is_primary),
      label: _.isUndefined(e.label) ? null : e.label,
      data: JSON.stringify(_.omit(e, ['email', 'label', 'is_primary', 'type']))
    })
    emailIsPrimary = emailIsPrimary || Boolean(e.is_primary)
  }
  emails.length && emailArr.length && queryArray.push(
    pgsql.insert()
      .into('contacts_emails')
      .setFieldsRows(emailArr)
      .toString()
  )
}

helpers.getInsertPhonesQuery = async function (contact, contactID, queryArray, errored) {
  const phones = _.get(contact, 'attributes.phone_numbers', [])
  let phoneIsPrimary = false
  const phoneNumbers = []
  for (const p of phones) {
    let phoneNumber = ObjectUtil.cleanPhoneNumber(p.phone_number)
    try {
      const def = validator.types.contact.attributes['phone_number']
      await promisify(validator)(def, p)
      phoneNumber = ObjectUtil.formatPhoneNumberForDialing(phoneNumber)
    }
    catch (err) {
      errored.push({
        subject: p.phone_number,
        type: 'phone_number',
        error: err
      })
      continue
    }
    
    phoneNumbers.push({
      contact: contactID,
      phone_number: phoneNumber,
      is_primary: phoneIsPrimary ? false : Boolean(p.is_primary),
      label: _.isUndefined(p.label) ? null : p.label,
      data: JSON.stringify(_.omit(p, ['phone_number', 'label', 'is_primary', 'type']))
    })
    phoneIsPrimary = phoneIsPrimary || Boolean(p.is_primary)
  }
  
  phones.length && phoneNumbers.length && queryArray.push(
    pgsql.insert()
      .into('contacts_phone_numbers')
      .setFieldsRows(phoneNumbers)
      .toString()
  )
}

helpers.getInsertAttributesQuery = async function (contact, contactID, queryArray, errored) {
  for (const key of Object.keys(contact.attributes)) {
    if (key === 'emails' || key === 'phone_numbers') {
      continue
    }
    
    const attrs = _.get(contact, `attributes.${key}`, [])
    let attrIsPrimary = false
    const attrsArr = []
    for (const a of attrs) {
      const def = validator.types.contact.attributes[a.type]
  
      if (!def) {
        errored.push({
          subject: JSON.stringify(a),
          type: `${a.type}. This is not a known attribute type`,
          error: Error.Validation(`${key} is not a known attribute type`)
        })
        continue
      }
      try {
        await promisify(validator)(def, a)
      } catch (err) {
        errored.push({
          subject: JSON.stringify(a),
          type: a.type,
          error: err
        })
        continue
      }
      attrsArr.push({
        contact: contactID,
        attribute_type: a.type,
        is_primary: attrIsPrimary ? false : Boolean(a.is_primary),
        label: _.isUndefined(a.label) ? null : a.label,
        attribute: JSON.stringify(_.omit(a, ['label', 'is_primary', 'type'])).replace("'", "''")
      })
      attrIsPrimary = attrIsPrimary || Boolean(a.is_primary)
    }
  
    attrs.length && attrsArr.length && queryArray.push(
      pgsql.insert()
        .into('contacts_attributes')
        .setFieldsRows(attrsArr)
        .toString()
    )
  }
}

helpers.getInsertErrorNotesQuery = function (errorNotes, contactID, queryArray) {
  const notesArr = []
  errorNotes.forEach(err => {
    notesArr.push({
      contact: contactID,
      attribute_type: 'note',
      is_primary: false,
      label: '',
      attribute: JSON.stringify(_.omit(err, 'type')).replace("'", "''")
    })
    
  })
  errorNotes.length && queryArray.push(
    pgsql.insert()
      .into('contacts_attributes')
      .setFieldsRows(notesArr)
      .toString()
  )
}

helpers.getAttributesQuery = async function (contactIDs, contacts) {
  
  const updateRefsQuery = []
  const insertEmailsQuery = []
  const insertPhoneNumbersQuery = []
  const insertAttrsQuery = []
  const insertErrorNotesQuery = []
  
  for (const [indx, c] of contacts.entries()) {
    const errors = []
    const contactID = contactIDs[indx]
    helpers.getUpdateRefsQuery(contactID, updateRefsQuery)
    await helpers.getInsertEmailsQuery(c, contactID, insertEmailsQuery, errors)
    await helpers.getInsertPhonesQuery(c, contactID, insertPhoneNumbersQuery, errors)
    await helpers.getInsertAttributesQuery(c, contactID, insertAttrsQuery, errors)
    
    const mappedErrors = errors.map(err => ({
      type: 'note',
      note: `Rechat was unable to store information for ${err.type} with value ${err.subject}`
    }))
    helpers.getInsertErrorNotesQuery(mappedErrors, contactID, insertErrorNotesQuery)
  }
  
  return {
    refsQuery: updateRefsQuery.length ? updateRefsQuery.join(';') : '',
    emailsQuery: insertEmailsQuery.length ? insertEmailsQuery.join(';') : '',
    phoneNumbersQuery: insertPhoneNumbersQuery.length ? insertPhoneNumbersQuery.join(';') : '',
    attrsQuery: insertAttrsQuery.length ? insertAttrsQuery.join(';') : '',
    errorNotesQuery: insertErrorNotesQuery.length ? insertErrorNotesQuery.join(';') : ''
  }
  
}

function getContacts(family, user_id, paging, cb) {
  db.query(family, [user_id, paging.type, paging.timestamp, paging.limit], (err, res) => {
    if (err)
      return cb(err)
    
    const contact_ids = res.rows.map(r => r.id)
    
    Contact.getAll(contact_ids, (err, contacts) => {
      if (err || !contacts)
        return cb(err)
      
      if (res.rows.length > 0)
        contacts[0].total = res.rows[0].total
      
      return cb(null, contacts)
    })
  })
}

Contact.extractNameInfo = function (contact) {
  let names = []
  let emails = []
  let phone_numbers = []
  
  if (contact.sub_contacts) {
    contact.sub_contacts.map(c => {
      if (c.attributes) {
        if (c.attributes.names)
          names = names.concat(c.attributes.names)
        
        if (c.attributes.emails)
          emails = emails.concat(c.attributes.emails)
        
        if (c.attributes.phone_numbers)
          phone_numbers = phone_numbers.concat(c.attributes.phone_numbers)
      }
      
      return false
    })
  }
  
  names = _u.chain(_u.sortBy(names, r => r.updated_at)).reverse().value()
  emails = _u.chain(_u.sortBy(emails, r => r.updated_at)).reverse().value()
  phone_numbers = _u.chain(_u.sortBy(phone_numbers, r => r.updated_at)).reverse().value()
  
  const candidate_name = names.find(item => item.is_primary) || names[0] || {}
  const candidate_email = emails.find(item => item.is_primary) || emails[0] || {}
  const candidate_phone_number = phone_numbers.find(item => item.is_primary) || phone_numbers[0] || {}
  
  return [
    candidate_name.title,
    candidate_name.legal_prefix,
    candidate_name.nickname,
    candidate_name.first_name,
    candidate_name.legal_first_name,
    candidate_name.middle_name,
    candidate_name.legal_middle_name,
    candidate_name.last_name,
    candidate_name.legal_last_name,
    candidate_email.email,
    candidate_phone_number.phone_number
  ]
}

const choose = (a, b) => _u.isEmpty(a) ? b : a
const pad = s => _u.isEmpty(s) ? '' : s + ' '

Contact.summarize = function (contact) {
  const [title, legal_prefix, , first_name, legal_first_name, middle_name, legal_middle_name, last_name, legal_last_name, email, phone_number] = Contact.extractNameInfo(contact)
  
  return {
    title: choose(title, legal_prefix),
    first_name: choose(first_name, legal_first_name),
    middle_name: choose(middle_name, legal_middle_name),
    last_name: choose(last_name, legal_last_name),
    legal_prefix: choose(legal_prefix, title),
    legal_first_name: choose(legal_first_name, first_name),
    legal_middle_name: choose(legal_middle_name, middle_name),
    legal_last_name: choose(legal_last_name, last_name),
    display_name: Contact.getDisplayName(contact),
    abbreviated_display_name: Contact.getAbbreviatedDisplayName(contact),
    legal_full_name: Contact.getLegalFullName(contact),
    email: email,
    phone_number: phone_number
  }
}

Contact.getLegalFullName = function (contact) {
  const [title, legal_prefix, nickname, first_name, legal_first_name, middle_name, legal_middle_name, last_name, legal_last_name, email, phone_number] = Contact.extractNameInfo(contact)
  
  const given_name = choose(legal_first_name, first_name)
  const surname = choose(legal_last_name, last_name)
  const prefix = choose(legal_prefix, title)
  const mid_name = choose(legal_middle_name, middle_name)
  
  if (!_u.isEmpty(given_name) && !_u.isEmpty(surname))
    return pad(prefix) + pad(given_name) + pad(mid_name) + surname
  
  if (!_u.isEmpty(nickname))
    return nickname
  
  if (!_u.isEmpty(given_name))
    return given_name
  
  if (!_u.isEmpty(surname))
    return pad(prefix) + surname
  
  if (!_u.isEmpty(email))
    return email
  
  if (!_u.isEmpty(phone_number))
    return phone_number
  
  return 'Guest'
}

Contact.getDisplayName = function (contact) {
  const [, , nickname, first_name, legal_first_name, , , last_name, legal_last_name, email, phone_number] = Contact.extractNameInfo(contact)
  
  const given_name = _u.isEmpty(first_name) ? legal_first_name : first_name
  const surname = _u.isEmpty(last_name) ? legal_last_name : last_name
  
  if (!_u.isEmpty(given_name) && !_u.isEmpty(surname))
    return given_name + ' ' + surname
  
  if (!_u.isEmpty(nickname))
    return nickname
  
  if (!_u.isEmpty(given_name))
    return given_name
  
  if (!_u.isEmpty(surname))
    return surname
  
  if (!_u.isEmpty(email))
    return email
  
  if (!_u.isEmpty(phone_number))
    return phone_number
  
  return 'Guest'
}

Contact.getAbbreviatedDisplayName = function (contact) {
  const [, , nickname, first_name, legal_first_name, , , , , email, phone_number] = Contact.extractNameInfo(contact)
  
  if (!_u.isEmpty(nickname))
    return nickname
  
  if (!_u.isEmpty(first_name))
    return first_name
  
  if (!_u.isEmpty(legal_first_name))
    return legal_first_name
  
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
  Contact.getAll([contact_id], (err, contacts) => {
    if (err)
      return cb(err)
    
    if (!contacts || contacts.length < 1)
      return cb(Error.ResourceNotFound(`Contact ${contact_id} not found`))
    
    const contact = contacts[0]
    
    return cb(null, contact)
  })
}

Contact.getAll = function (contact_ids, cb) {
  expect(contact_ids).to.be.a('array')
  
  db.query('contact/get', [contact_ids], (err, res) => {
    if (err)
      return cb(err)
    
    const contacts = res.rows.map(contact => {
      if (contact.sub_contacts) {
        contact.sub_contacts.map(r => {
          
          if (!r.attributes)
            r.attributes = {}
          
          Object.keys(r.attributes).map(k => {
            r.attributes[pluralize(k)] = r.attributes[k]
            delete r.attributes[k]
          })
          
          r.attributes.type = 'attributes'
          
          if (r.phone_numbers) {
            r.attributes.phone_numbers = r.phone_numbers
            
            delete r.phone_numbers
          }
          
          if (r.emails) {
            r.attributes.emails = r.emails
            
            delete r.emails
          }
          
          if (Object.keys(r.attributes).length === 0)
            delete r.attributes
        })
      }
      
      contact.summary = Contact.summarize(contact)
      contact.display_name = Contact.getDisplayName(contact)
      contact.abbreviated_display_name = Contact.getAbbreviatedDisplayName(contact)
      
      return contact
    })
    
    return cb(null, contacts)
  })
}

Contact.add = async (user_id, contact, options = {}) => {
  const attributes = contact.attributes ? contact.attributes : {}
  
  await validate(contact)
  
  const contact_id = (await db.query.promise('contact/add', [
    user_id,
    contact.ios_address_book_id,
    contact.android_address_book_id
  ]))
    .rows[0]
    .id
  
  await promisify(Contact.setRefs)(contact_id, [contact_id])
  
  const errored = []
  for (const type in attributes) {
    for (const attr of attributes[type]) {
      
      try {
        await promisify(Contact.addAttribute)(contact_id, user_id, attr)
      } catch (err) {
        if (!options.relax)
          throw err
        
        errored.push(attr)
      }
    }
  }
  
  let error_note = 'Rechat was unable to save the following information: \r\n\r\n'
  
  for (const attr of errored) {
    for (const key in attr)
      error_note += `${key}: ${attr[key]}\r\n`
    
    error_note += '\r\n\r\n'
  }
  
  if (errored.length > 0)
    await promisify(Contact.addAttribute)(contact_id, user_id, {
      type: 'note',
      note: error_note
    })
  
  if (options.activity !== false) {
    const activity = {
      action: 'UserCreatedContact',
      object: contact_id,
      object_class: 'contact'
    }
    
    await promisify(Activity.add)(contact_id, 'Contact', activity)
  }
  
  
  if (options.get === false)
    return contact_id
  
  const saved = await promisify(Contact.get)(contact_id)
  saved.device_contact_id = contact.device_contact_id
  return saved
}

Contact.addBulk = async function (user_id, contacts, options = {}) {
  const executeSql = promisify(db.executeSql)
  let contactInsertionTime = Date.now()
  const mainInsert = []
  
  for (const c of contacts) {
    await validate(c)
    mainInsert.push({
      user: user_id,
      ios_address_book_id: _u.isUndefined(c.ios_address_book_id) ? null : c.ios_address_book_id,
      android_address_book_id: _u.isUndefined(c.android_address_book_id) ? null : c.android_address_book_id,
      created_at: new Date(contactInsertionTime++).toISOString()
    })
  }
  
  let q = pgsql.select()
    .from('newrows')
    .field('id')
    .order('created_at')
    .with('newrows',
      pgsql.insert({autoQuoteFieldNames: true, nameQuoteCharacter: '"'})
        .into('contacts')
        .setFieldsRows(mainInsert)
        .returning('*'))
    .toParam()
  
  let dbRes
  try {
    dbRes = await executeSql(q.text, q.values)
  }
  catch (error) {
    return Promise.reject(error)
  }
  dbRes = _.get(dbRes, 'rows', []).map(r => r.id)
  
  q = await helpers.getAttributesQuery(dbRes, contacts)
  
  await executeSql(q.refsQuery + ';' + q.emailsQuery + ';' + q.phoneNumbersQuery + ';' + q.attrsQuery + ';' + q.errorNotesQuery, [])
  
  return Promise.resolve(dbRes)
}

Contact.remove = function (contact_id, cb) {
  db.query('contact/delete', [contact_id], cb)
}

Contact.patch = function (contact_id, params, cb) {
  expect(params).to.be.a('object')
  
  if (params.ios_address_book_id)
    expect(params.ios_address_book_id).to.be.a('string')
  
  if (params.android_address_book_id)
    expect(params.android_address_book_id).to.be.a('string')
  
  db.query('contact/patch', [
    contact_id,
    params.ios_address_book_id,
    params.android_address_book_id
  ], cb)
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
        if (err)
          return cb(err)
        
        // if(contact.user !== user_id)
        //   return cb(Error.Forbidden('You are not allowed to patch a contact that does not belong to you.'))
        
        return cb()
      })
    },
    validate: cb => {
      const def = validator.types.contact.attributes[attribute_type]
      
      if (!def)
        return cb(Error.Validation(`${attribute_type} is not a known attribute type`))
      
      validator(def, attribute, cb)
    },
    email: [
      'check',
      cb => {
        if (attribute_type !== 'email')
          return cb()
        
        expect(attribute.email).to.be.a('string')
        const email = attribute.email
        
        return db.query('contact/update_email', [
          contact_id,
          attribute_id,
          email,
          omit(attribute, ['email', 'type', 'label', 'is_primary']),
          attribute.label,
          Boolean(attribute.is_primary),
        ], cb)
      }
    ],
    phone_number: [
      'check',
      cb => {
        if (attribute_type !== 'phone_number')
          return cb()
        
        expect(attribute.phone_number).to.be.a('string')
        let phone_number = attribute.phone_number
        const _p = phone_number
        
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
          omit(attribute, ['phone_number', 'type', 'label', 'is_primary']),
          attribute.label,
          Boolean(attribute.is_primary),
        ], cb)
      }
    ],
    other: [
      'check',
      cb => {
        if (attribute_type === 'phone_number' || attribute_type === 'email')
          return cb()
        
        return db.query('contact/update_attribute', [
          contact_id,
          attribute_id,
          attribute_type,
          omit(attribute, ['type', 'label', 'is_primary']),
          attribute.label,
          Boolean(attribute.is_primary),
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
    if (err)
      return cb(err)
    
    return cb(null, results.get)
  })
}

Contact.addAttribute = function (contact_id, user_id, attribute, cb) {
  expect(attribute).to.be.a('object')
  
  const attribute_type = attribute.type
  expect(attribute_type).to.be.a('string')
  
  async.auto({
    validate: cb => {
      const def = validator.types.contact.attributes[attribute_type]
      
      if (!def)
        return cb(Error.Validation(`${attribute_type} is not a known attribute type`))
      
      validator(def, attribute, cb)
    },
    email: [
      cb => {
        if (attribute_type !== 'email')
          return cb()
        
        expect(attribute.email).to.be.a('string')
        
        return db.query('contact/add_email', [
          contact_id,
          attribute.email,
          omit(attribute, ['email', 'type', 'label', 'is_primary']),
          attribute.label,
          Boolean(attribute.is_primary),
        ], cb)
      }
    ],
    phone_number: [
      cb => {
        if (attribute_type !== 'phone_number')
          return cb()
        
        expect(attribute.phone_number).to.be.a('string')
        let phone_number = attribute.phone_number
        const _p = phone_number
        
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
          omit(attribute, ['phone_number', 'type', 'label', 'is_primary']),
          attribute.label,
          Boolean(attribute.is_primary),
        ], cb)
      }
    ],
    other: [
      cb => {
        if (attribute_type === 'phone_number' || attribute_type === 'email')
          return cb()
        
        return db.query('contact/add_attribute', [
          contact_id,
          attribute_type,
          omit(attribute, ['type', 'label', 'is_primary']),
          attribute.label,
          Boolean(attribute.is_primary),
        ], cb)
      }
    ]
  }, cb)
}

Contact.setRefs = function (contact_id, refs, cb) {
  db.query('contact/set_refs', [contact_id, refs], cb)
}

Contact.getAttribute = function (contact_id, user_id, attribute_id, cb) {
  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attribute_id).to.be.uuid
  
  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if (err)
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
    if (err)
      return cb(err)
    
    const email = results.email.rows
    const phone_number = results.phone_number.rows
    const other = results.other.rows
    const attr = email.length > 0 ? email[0] : (phone_number.length > 0 ? phone_number[0] : (other.length > 0 ? other[0] : undefined))
    
    if (!attr)
      return cb(Error.ResourceNotFound(`Attribute ${attribute_id} not found for this contact`))
    
    return cb(null, attr)
  })
}

Contact.deleteAttribute = function (contact_id, user_id, attribute_id, cb) {
  expect(contact_id).to.be.uuid
  expect(user_id).to.be.uuid
  expect(attribute_id).to.be.uuid
  
  async.auto({
    check: cb => {
      Contact.get(contact_id, (err, contact) => {
        if (err)
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
    if (err)
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
    
    Contact.getAll(contact_ids, (err, contacts) => {
      if (err)
        return cb(err)
      
      if (contacts[0])
        contacts[0].total = res.rows[0].total
      
      return cb(null, contacts)
    })
  })
}

Contact.getByTags = function (user_id, tags, cb) {
  return Contact.getByAttribute(user_id, 'tag', tags).nodeify(cb)
}

Contact.getByAttribute = async function (user_id, attribute, values) {
  const res = await db.query.promise('contact/get_by_attribute', [
    user_id,
    attribute,
    values
  ])
  
  if (res.rows.legnth < 1)
    return null
  
  const contact_ids = res.rows.map(r => r.contact)
  return promisify(Contact.getAll)(contact_ids)
}

Contact.getAllTags = function (user_id, cb) {
  db.query('tag/get_all', [user_id], (err, res) => {
    if (err)
      return cb(err)
    
    if (res.rows.length < 1)
      return cb(null, [])
    
    let tags = res.rows.map(r => {
      return r.tag
    })
    
    tags = _u.uniq(tags, (i, k, v) => {
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
      
      return Contact.add(user_id, contact).nodeify(cb)
    })
  })
}

Contact.convertUser = function (user, override) {
  /** @type {Partial<IContact>} */
  const contact = {}
  contact.attributes = {}
  
  if (override)
    expect(override).to.be.a('object')
  
  if (!_u.isEmpty(user.email) && !user.fake_email) {
    contact.attributes.emails = [
      {
        type: 'email',
        email: user.email
      }
    ]
  }
  
  if (!_u.isEmpty(user.phone_number)) {
    contact.attributes.phone_numbers = [
      {
        type: 'phone_number',
        phone_number: user.phone_number
      }
    ]
  }
  
  if (!_u.isEmpty(user.first_name) || !_u.isEmpty(user.last_name)) {
    contact.attributes.names = [
      {
        type: 'name',
        first_name: (user.first_name) ? user.first_name : undefined,
        last_name: (user.last_name) ? user.last_name : undefined
      }
    ]
  }
  
  if (!_u.isEmpty(user.profile_image_url)) {
    contact.attributes.profile_image_urls = [
      {
        type: 'profile_image_url',
        profile_image_url: user.profile_image_url
      }
    ]
  }
  
  if (!_u.isEmpty(user.cover_image_url)) {
    contact.attributes.cover_image_urls = [
      {
        type: 'cover_image_url',
        cover_image_url: user.cover_image_url
      }
    ]
  }
  
  contact.attributes.source_types = [
    {
      type: 'source_type',
      source_type: (override && override.source_type) ? override.source_type : 'SharesRoom'
    }
  ]
  
  if (override && override.brand) {
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
  },
  deals: {
    collection: true,
    optional: true,
    model: 'Deal',
    enabled: false
  }
}

Tag.associations = {}

module.exports = function () {

}
