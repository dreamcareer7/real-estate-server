const AttachedFile = require('../../AttachedFile/get')
const SMS = require('../../SMS')
const Url = require('../../Url')
const Branch = require('../../Branch')

const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')

const config = require('../../../config')

const setBranch = async asset => {
  const b = {}
  b.brand_asset = asset.id
  b.action = 'ShareBrandAsset'

  const url = Url.web({
    uri: '/branch',
  })
  b['$desktop_url'] = url

  b.file = await AttachedFile.get(asset.file)

  const branch = await Branch.createURL(b)

  await db.query.promise('brand/asset/set-branch', [
    asset.id,
    branch
  ])

  return branch
}

const share = async ({asset, text, recipients}) => {
  const branch = asset.branch ?? (await setBranch(asset))

  const sms = {
    from: config.twilio.from,
    body: text + '\n' + branch
  }

  for(const to of recipients)
    await promisify(SMS.send)({
      ...sms,
      to
    })
}

module.exports = {
  share,
  setBranch
}
