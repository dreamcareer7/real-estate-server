const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const render  = require('../../utils/render')
const { peanar } = require('../../utils/peanar')

const User = require('../User/get')
const AttachedFile = require('../AttachedFile')

const Brand = {
  ...require('../Brand/get'),
  ...require('../Brand/access')
}

const BrandSettings = {
  ...require('../Brand/settings/get')
}

const Context = require('../Context')
const Template = require('../Template/get')
const BrandTemplate = require('../Template/brand/get')
const Email = require('../Email/create')

const renderThumbnail = require('../Template/thumbnail/render')
const renderImage = require('../Template/render')

const save = async ({html, width, height, user, template, listing}) => {
  const filename = `${template.id}.png`
  const path = `temp/${user.id}/${listing.id}/${Date.now()}`

  const { file, presigned } = await AttachedFile.preSave({
    filename,
    path,
    public: false,
    keyname: filename,
    expires: (Date.now() + (86400 * 60)) / 1000 // Expires in 60 days
  })

  await renderImage({
    html,
    width,
    height,
    presigned,
    template
  })

  return file
}

const generateThumbnail = async ({
  brand_template,
  listing,
  user
}) => {
  const brand = await Brand.get(brand_template.brand)
  const { marketing_palette: palette } = await BrandSettings.getByBrand(brand.id)
  const template = await Template.get(brand_template.template)
  const file = await AttachedFile.get(template.file)

  let source
  try {
    source = (await promisify(AttachedFile.download)(file.id)).toString()
  } catch(e) {
    console.log(e)
    Context.log(`Could not find index file for template ${template.id}`)
    return
  }

  const html = await renderThumbnail({
    html: source,
    template,
    brand,
    palette,
    variables: {
      listing,
      user
    }
  })

  return save({
    listing,
    user,
    html,
    template,
    width: 800,
  })
}

const generateThumbnails = async ({listing, templates, user}) => {
  const promises = []
  for(const template of templates) {
    const p = generateThumbnail({listing, user, brand_template: template})
    promises.push(p)
  }

  return Promise.all(promises)
}

const notifyAgent = async ({listing, template, user, template_types, subject}) => {
  Context.log('Notifying', user.email, 'On', listing.id)

  const mc_brand_ids = await Brand.getUserBrands(user.id, [
    'Marketing'
  ])

  const websites_brand_ids = await Brand.getUserBrands(user.id, [
    'Websites'
  ])

  const social_templates = await BrandTemplate.getForBrands({
    types: template_types,
    mediums: ['Social'],
    brands: mc_brand_ids
  })

  const email_templates = await BrandTemplate.getForBrands({
    types: template_types,
    mediums: ['Email'],
    brands: mc_brand_ids
  })

  const website_templates = await BrandTemplate.getForBrands({
    types: ['Listing'],
    mediums: ['Website'],
    brands: websites_brand_ids
  })

  // The CTA's in the emails should point to a brand.
  // So we want a brand with a good hostnames.
  // For now we rely on the hostname of the brand of the first template we find.


  const all = [...social_templates, ...email_templates, ...website_templates ]
  if (all.length < 1)
    return Context.log('No templates available for', user.email)

  const [ first ] = all
  const { brand: brand_id } = first
  const brand_ids = await Brand.getParents(brand_id)
  const brands = await Brand.getAll(brand_ids)

  for(const brand of brands)
    if (brand.hostnames?.length) {
      Context.set({brand})
      break
    }

  const p1 = generateThumbnails({
    templates: social_templates.slice(0,4),
    listing,
    user
  })

  const p2 = generateThumbnails({
    templates: email_templates.slice(0,4),
    listing,
    user
  })

  const p3 = generateThumbnails({
    templates: website_templates.slice(0,4),
    listing,
    user
  })

  const [ socials, emails, websites ] = await Promise.all([p1, p2, p3])

  const data = {
    user,
    listing,
    socials,
    emails,
    websites
  }

  const path = `${__dirname}/../../mjml/listing/${template}.mjml`
  const html = await promisify(render.mjml)(path, data)

  return Email.create({
    to: ['emil@rechat.com', 'shayan@rechat.com', 'abbas@rechat.com', 'm4m4lj@gmail.com'],
    html,
    tags: ['listing-notification'],
    subject
  })
}

const notify = async ({listing, template, template_types, subject}) => {
  const agent_user_ids = await db.selectIds('listing/agents', [ listing.id ])
  const users = await User.getAll(agent_user_ids)

  await Promise.all(users.map(user => {
    return notifyAgent({
      listing,
      user,
      template,
      template_types,
      subject
    })
  }))
}

class ListingNotificationError extends Error {
  constructor(listing) {
    super('Cannot generate beautiful email notifications for listings without photos')
    this.slack = false
    this.listing = listing.id
    this.matrix_unique_id = listing.matrix_unique_id
    this.mls_number = listing.mls_number
    this.mls = listing.mls
  }
}

const checkGalleryItems = listing => {
  if (listing.gallery_image_urls.length < 1) {
    // If we fail here, we will retry after 30 minutes and hopefully the listing will have a photo by then
    throw new ListingNotificationError(listing)
  }
}

const _justListed = async listing => {
  checkGalleryItems(listing)
  return notify({
    listing,
    template: 'just-listed',
    template_types: ['JustListed'],
    subject: `${listing.property.address.street_address} Just Listed!`
  })
}

const _openHouse = async listing => {
  checkGalleryItems(listing)
  return notify({
    listing,
    template: 'open-house',
    template_types: ['OpenHouse'],
    subject: `Hosting an Open House on ${listing.property.address.street_address}?`
  })
}

const _priceImprovement = async listing => {
  checkGalleryItems(listing)
  return notify({
    listing,
    template: 'price-improvement',
    template_types: ['PriceImprovement'],
    subject: `Price improvement on ${listing.property.address.street_address}`
  })
}

const justListed = peanar.job({
  handler: _justListed,
  name: 'listing_justlisted',
  queue: 'listing_notifications',
  exchange: 'listing_notifications',
  max_retries: 5,
  retry_exchange: 'listing_notifications.retry',
  error_exchange: 'listing_notifications.error',
  retry_delay: 30 * 60000,
  delayed_run_wait: 15 * 60000,
})

const openHouse = peanar.job({
  handler: _openHouse,
  name: 'listing_openhouse',
  queue: 'listing_notifications',
  exchange: 'listing_notifications',
  max_retries: 5,
  retry_exchange: 'listing_notifications.retry',
  error_exchange: 'listing_notifications.error',
  retry_delay: 30 * 60000,
  delayed_run_wait: 15 * 60000,
})

const priceImprovement = peanar.job({
  handler: _priceImprovement,
  name: 'listing_priceimprovement',
  queue: 'listing_notifications',
  exchange: 'listing_notifications',
  max_retries: 5,
  retry_exchange: 'listing_notifications.retry',
  error_exchange: 'listing_notifications.error',
  retry_delay: 30 * 60000,
  delayed_run_wait: 15 * 60000,
})

module.exports = {
  justListed,
  openHouse,
  priceImprovement
}
