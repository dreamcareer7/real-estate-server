const db = require('../../utils/db')
const Context = require('../Context')

const BrandSettings = {}

BrandSettings.set = async setting => {
  const {
    brand,
    key,
    number,
    text,
    boolean,
    date,
    palette,
    user
  } = setting

  await db.query.promise('brand/settings/set', [
    user.id,
    Context.getId(),
    brand,
    key,
    number,
    text,
    boolean,
    date,
    palette
  ])
}

module.exports = BrandSettings
