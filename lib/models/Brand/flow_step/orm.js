const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

/**
 * @param {import('./types').IStoredBrandFlowStep} step
 * @returns {import('./types').IStoredBrandFlowStep}
 */
function publicize(step) {
  if (step.wait_for_unit === 'weeks' && step.wait_for.days) {
    const days = step.wait_for.days
    step.wait_for = { weeks: days / 7 }
  }
  return step
}

const associations = {
  event: {
    model: 'BrandEvent',
    enabled: false,
    collection: false,
    optional: true
  },

  email: {
    model: 'BrandEmail',
    enabled: false,
    collection: false,
    optional: true
  },

  template: {
    model: 'BrandTemplate',
    enabled: false,
    collection: false,
    optional: true
  },

  template_instance: {
    model: 'TemplateInstance',
    enabled: false,
    collection: false,
    optional: true
  }
}


Orm.register('brand_flow_step', 'BrandFlowStep', {
  getAll,
  publicize,
  associations,
})
