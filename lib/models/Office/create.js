const db = require('../../utils/db')
const { timeout } = require('../../utils/timeout')
const validator = require('../../utils/validator')

const schema = {
  type: 'object',
  properties: {
    board: {
      type: 'string'
    },

    email: {
      type: 'string'
    },

    fax: {
      type: 'string'
    },

    office_mui: {
      type: ['number', 'string', 'null'],
    },

    office_mls_id: {
      type: 'string'
    },

    license_number: {
      type: 'string'
    },

    address: {
      type: 'string'
    },

    care_of: {
      type: 'string'
    },

    city: {
      type: 'string'
    },

    postal_code: {
      type: 'string'
    },

    postal_code_plus4: {
      type: 'string'
    },

    state: {
      type: 'string'
    },

    matrix_unique_id: {
      type: ['number', 'string'],
      required: true
    },

    matrix_modified_dt: {
      type: 'string'
    },

    mls: {
      type: 'string'
    },

    mls_id: {
      type: 'string'
    },

    mls_provider: {
      type: 'string'
    },

    nar_number: {
      type: 'string'
    },

    contact_mui: {
      type: 'string'
    },

    contact_mls_id: {
      type: 'string'
    },

    long_name: {
      type: 'string'
    },

    name: {
      type: 'string'
    },

    status: {
      type: 'string'
    },

    phone: {
      type: 'string'
    },

    other_phone: {
      type: 'string'
    },

    st_address: {
      type: 'string'
    },

    st_city: {
      type: 'string'
    },

    st_country: {
      type: 'string'
    },

    st_postal_code: {
      type: 'string'
    },

    st_postal_code_plus4: {
      type: 'string'
    },

    st_state: {
      type: 'string'
    },

    url: {
      type: 'string'
    }
  }
}

const validate = validator.promise.bind(null, schema)

const create = async office => {
  try {
    await validate(office)
  } catch (ex) {
    // Usually such errors occur at a high frequency one after another.
    // This will put a little bit of space between them.
    await timeout(500)
    ex.message = ex.message.replace('Validation Error', `Validation Error(${office.mls})`)
    throw ex
  }

  const res = await db.query.promise('office/insert', [
    office.board,
    office.email,
    office.fax,
    office.office_mui,
    office.office_mls_id,
    office.license_number,
    office.address,
    office.care_of,
    office.city,
    office.postal_code,
    office.postal_code_plus4,
    office.state,
    office.matrix_unique_id,
    office.matrix_modified_dt,
    office.mls_name,
    office.mls_id,
    office.mls_provider,
    office.nar_number,
    office.contact_mui,
    office.contact_mls_id,
    office.long_name,
    office.name,
    office.status,
    office.phone,
    office.other_phone,
    office.st_address,
    office.st_city,
    office.st_country,
    office.st_postal_code,
    office.st_postal_code_plus4,
    office.st_state,
    office.url,
    office.mls,
    office.broker_mui,
    office.broker_mls_id
  ])

  return res.rows[0].id
}

module.exports = { create }
