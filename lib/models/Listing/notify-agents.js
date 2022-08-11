const { keyBy } = require('lodash')
const db = require('../../utils/db')
const promisify = require('../../utils/promisify')
const render = require('../../utils/render')
const { peanar } = require('../../utils/peanar')
const User = require('../User/get')
const AttachedFile = require('../AttachedFile')
const Listing = require('../Listing/get')

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


const JUST_LISTED = 'JustListed'
const JUST_SOLD = 'JustSold'
const PRICE_IMPROVEMENT = 'PriceImprovement'
const OPEN_HOUSE = 'OpenHouse'

const save = async ({ html, width, height, user, template, listing }) => {
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
  } catch (e) {
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
  }).catch(ex => {
    Context.log('Error while generating thumbnail for listing ' +
      `${listing.mls}:${listing.mls_number} ` + 'with template ' +
      `${template.medium}:${template.name}:${template.variant}`)
    ex.retry = false
    throw ex
  })

  return save({
    listing,
    user,
    html,
    template,
    width: 800,
  })
}

const generateThumbnails = async ({ listing, templates, user }) => {
  const promises = []
  for (const template of templates) {
    const p = generateThumbnail({ listing, user, brand_template: template })
    promises.push(p)
  }

  return Promise.all(promises)
}

const notifyAgent = async ({ listing, type, user, template_types, subject, enable_websites, subscriptions = [] }) => {
  
  Context.log('Notifying', user.email, 'On', listing.id)

  const mc_brand_ids = await Brand.getDirectUserBrands(user.id, [
    'Marketing'
  ])

  const websites_brand_ids = await Brand.getDirectUserBrands(user.id, [
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

  const website_templates = enable_websites ? (await BrandTemplate.getForBrands({
    types: ['Listing'],
    mediums: ['Website'],
    brands: websites_brand_ids
  })) : []

  // The CTA's in the emails should point to a brand.
  // So we want a brand with a good hostnames.
  // For now we rely on the hostname of the brand of the first template we find.


  const open_houses = type === 'OpenHouse' ? (await BrandTemplate.getForBrands({
    types: ['CrmOpenHouse'],
    brands: mc_brand_ids
  })) : []

  const all = [...social_templates, ...email_templates, ...website_templates, ...open_houses]
  if (all.length < 1)
    return Context.log('No templates available for', user.email)

  const [first] = all
  const { brand: brand_id } = first
  const brand_ids = await Brand.getParents(brand_id)
  const brands = await Brand.getAll(brand_ids)
  const settings = await BrandSettings.getByBrands(brand_ids)
  let logoSrc = 'https://assets.rechat.com/daily/logo.png'
  
  const getKeyFromPalette = (brandSettings, key) => {
    return brandSettings?.marketing_palette?.[key]
  }

  for (let index = 0; index < settings.length; index++) {
    if (!logoSrc) {
      logoSrc = getKeyFromPalette(settings[index], 'container-logo-wide')
      break
    }
  }

  for (const brand of brands)
    if (brand.hostnames?.length) {
      Context.set({ brand })
      break
    }

  const p1 = generateThumbnails({
    templates: social_templates.slice(0, 3),
    listing,
    user
  })

  const p2 = generateThumbnails({
    templates: email_templates.slice(0, 1),
    listing,
    user
  })

  const p3 = generateThumbnails({
    templates: website_templates.slice(0, 1),
    listing,
    user
  })

  const p4 = generateThumbnails({
    templates: open_houses.slice(0, 1),
    listing,
    user
  })

  const [socials, emails, websites, openHouses] = await Promise.all([p1, p2, p3, p4])
  
  const data = {
    user,
    listing,
    socials,
    emails,
    websites,
    logoSrc,
    openHouses
  }

  const path = `${__dirname}/../../mjml/listing/${type}.mjml`
  const html = await promisify(render.mjml)(path, data)
  return Email.create({
    to: [user.email],
    html,
    tags: ['listing-notification'],
    subject,
    bcc: subscriptions
  })
}

const notify = async ({ listing, type, template_types, subject, enable_websites }) => {
  const rows = await db.select('listing/agents', [listing.id, type])
  const users = await User.getAll(rows.map(r => r.user))
  const indexed = keyBy(rows, 'user')
  
  /*
   * We only have to process this if we have matching agents AND if it has photos already.
   * If there are no photos, we want to retry the job in a while, by rejecting it through an error.
   *
   * If we put the photo check before user check, that means we'll keep trying this job
   * for listings that have nothing to do with our users amd just filling the queue up.
   *
   * So the logic is this:
   * If we don't have any matching agents, just discard the job.
   * If we have agents that are interested, but photos are not avail yet, retry in a wihle.
   * Else means we have agents for these and we have photos. Bingo. Move forward.
   */

  if (users.length < 1)
    return
  
  if (listing.gallery_image_urls.length < 1) {
    // If we fail here, we will retry after 30 minutes and hopefully the listing will have a photo by then
    throw new Error.Generic({
      message: `Cannot generate email for ${listing.id} since it has no photos`,
      slack: false,
      listing: listing.id,
      retry: false
    })
  }
  Context.log(`notifying ${users.length} users...`)
  await Promise.all(users.map(user => {
    const { subscriptions } = indexed[user.id]
    return notifyAgent({
      listing,
      user,
      type,
      template_types,
      subject,
      enable_websites,
      subscriptions
    })
  }))
}

const _justListed = async listing_id => {
  const listing = await promisify(Listing.get)(listing_id)

  return notify({
    listing,
    type: JUST_LISTED,
    template_types: ['JustListed'],
    subject: `${listing.property.address.street_address} Just Listed!`,
    enable_websites: true
  })
}

const _openHouse = async listingId => {
  const listing = await promisify(Listing.get)(listingId)

  return notify({
    listing,
    type: OPEN_HOUSE,
    template_types: ['OpenHouse'],
    subject: `Hosting an Open House on ${listing.property.address.street_address}?`
  })
}

const _priceImprovement = async listing_id => {
  const listing = await promisify(Listing.get)(listing_id)

  return notify({
    listing,
    type: PRICE_IMPROVEMENT,
    template_types: ['PriceImprovement'],
    subject: `Price improvement on ${listing.property.address.street_address}`
  })
}

const _justSold = async listing_id => {
  const listing = await promisify(Listing.get)(listing_id)
  return notify({
    listing,
    type: JUST_SOLD,
    template_types: ['JustSold'],
    subject: `${listing.property.address.street_address} Just Sold!`
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
})

const justSold = peanar.job({
  handler: _justSold,
  name: 'listing_justSold',
  queue: 'listing_notifications',
  exchange: 'listing_notifications',
  max_retries: 5,
  retry_exchange: 'listing_notifications.retry',
  error_exchange: 'listing_notifications.error',
  retry_delay: 30 * 60000,
})

module.exports = {
  justListed,
  openHouse,
  priceImprovement,
  justSold
}
