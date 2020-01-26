const db = require('../../utils/db')
const Context = require('../Context')
const Orm = require('../Orm')

const BrandSettings = {}

BrandSettings.set = async setting => {
  const {
    brand,
    key,
    number,
    text,
    boolean,
    date,
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
    date
  ])
}

module.exports = BrandSettings
