const db = require('../utils/db.js')
const validator = require('../utils/validator.js')

PropertyUnit = {}

const schema = {
  type: 'object',
  properties: {
    matrix_unique_id: {
      type: 'number',
      required: true
    }
  }
}

const validate = validator.bind(null, schema)

PropertyUnit.create = function (unit, cb) {
  validate(unit, function (err) {
    if (err)
      return cb(err)

    db.query('property_unit/insert', [
      unit.dining_length,
      unit.dining_width,
      unit.kitchen_length,
      unit.kitchen_width,
      unit.lease,
      unit.listing_mui,
      unit.living_length,
      unit.living_width,
      unit.master_length,
      unit.master_width,
      unit.matrix_unique_id,
      unit.matrix_modified_dt,
      unit.full_bath,
      unit.half_bath,
      unit.beds,
      unit.units,
      unit.square_feet
    ], cb)
  })
}

PropertyUnit.getByMUI = function (id, cb) {
  db.query('property_unit/get_mui', [id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Property Unit not found.'))

    return cb(null, res.rows[0].id)
  })
}

module.exports = function () {
}
