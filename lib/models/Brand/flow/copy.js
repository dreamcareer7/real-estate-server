const _ = require('lodash')
const Orm = require('../../Orm/index')
const BrandFlow = {
  ...require('./get'),
  ...require('./access'),
  ...require('./create'),
}

const BrandEmail = {
  ...require('../email/save'),
  ...require('../email/get'),
}

/**
 * @param {UUID} source_brand 
 * @param {UUID} destination_brand 
 */
async function copy(source_brand, destination_brand) {
  // const destination_brands = await BrandFlow.forBrand(destination_brand)
  // const destination_brand_emails = await BrandEmail.getByBrand(destination_brand)

  const models = await BrandFlow.forBrand(source_brand)
  /** @type {import('./types').IPopulatedBrandFlow<'brand_flow.steps' | 'brand_flow_step.event' | 'brand_flow_step.email'>[]} */
  const brand_flows = await Orm.populate({
    models,
    associations: [
      'brand_flow.steps',
      'brand_flow_step.event',
      'brand_flow_step.email',
    ]
  })

  const user_id = models[0].created_by

  const brand_emails = await BrandEmail.getByBrand(source_brand)
  const dest_brand_emails = await Promise.all(brand_emails.map(be => BrandEmail.create({
    ...be,
    created_by: user_id,
    brand: destination_brand,
  })))

  const emails_id_map = _.zipObject(brand_emails.map(be => be.id), dest_brand_emails.map(dbe => dbe.id))

  for (const bf of brand_flows) {
    if (!Array.isArray(bf.steps)) continue

    for (const step of bf.steps) {
      if (step.email) {
        step.email = emails_id_map[step.email.id]
      }
    }
    
    await BrandFlow.create(destination_brand, user_id, bf)
  }
}

module.exports = {
  copy
}
