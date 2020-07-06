const promisify = require('../../../lib/utils/promisify')
const Alert = require('../../../lib/models/Alert')
const RoomHelper = require('../room/helper')

const base = {
  'title': 'Test Title',
  'property_types': ['Residential'],
  'property_subtypes': ['RES-Single Family', 'RES-Half Duplex', 'RES-Farm/Ranch', 'RES-Condo', 'RES-Townhouse'],
}



async function create(user_id, brand_id, data) {
  const {
    created: room,
    user
  } = await RoomHelper.create()

  const created = await promisify(Alert.create)(room.id, {
    ...base,
    created_by: user.id
  })

  return {
    room,
    user,
    base,
    created
  }
}

module.exports = {
  create
}
