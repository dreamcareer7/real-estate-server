const Orm = require('../Orm/registry')
const { getAll } = require('./get')


const associations = {
  template_instance: {
    model: 'TemplateInstance',
    enabled: false,
    
  },
  owner: {
    model: 'User',
    enabled: false,
  }
}

// type, model_name
Orm.register('social_post', 'SocialPost', {
  getAll,
  associations,
})
