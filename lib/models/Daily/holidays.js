const moment = require('moment-timezone')
const _ = require('lodash')

const Holiday = require('../Holiday/get')
const Brand = require('../Brand/access')
const BrandTemplate = require('../Template/brand/get')
const BrandAsset = require('../Brand/asset/get')
const Template = require('../Template/get')
const AttachedFile = require('../AttachedFile/get')

const getHolidays = async user => {
  const brands = await Brand.getUserBrands(user.id, [
    'Marketing'
  ])

  if (brands.length < 1)
    return []

  const holidays = await Holiday.getUpcoming(moment().add(2, 'days'))
  if (holidays.length < 1)
    return []

  const template_types = holidays.map(holiday => holiday.template_type).filter(Boolean)

  const brand_templates = await getTemplates(brands, template_types)
  const indexed_brand_templates = _.keyBy(brand_templates, 'template')

  const brand_assets = await getAssets(brands, template_types)

  const template_ids = _.map(brand_templates, 'template')
  const templates = await Template.getAll(template_ids)

  const thumbnail_ids = [
    ..._.map(brand_templates, 'thumbnail'),
    ..._.map(brand_assets, 'file')
  ]
  const thumbnails = await AttachedFile.getAll(thumbnail_ids)
  const indexed_thumbnails = _.keyBy(thumbnails, 'id')

  for(const holiday of holidays) {
    const { template_type } = holiday

    const holiday_templates = _.filter(templates, {template_type})
    const holiday_brand_templates = holiday_templates.map(template => indexed_brand_templates[template.id])
    const holiday_thumbnails = holiday_brand_templates.map(bt => indexed_thumbnails[bt.thumbnail])

    const holiday_assets = _.filter(brand_assets, {template_type})
    holiday_thumbnails.push(...holiday_assets.map(asset => indexed_thumbnails[asset.file]).filter(file => file.mime.startsWith('image')))

    holiday.thumbnails = holiday_thumbnails
  }

  return holidays.filter(holiday => holiday.thumbnails?.length)
}

const getTemplates = async (brands, types) => {
  const brand_templates = await BrandTemplate.getForBrands({
    types,
    mediums: ['Social'],
    brands
  })

  return brand_templates
}

const getAssets = async (brands, template_types) => {
  const assets = BrandAsset.getByBrands({
    brands,
    template_types,
    mediums: ['Social']
  })
}

module.exports = { getHolidays }
