const Orm = require('../Orm/registry')
const { getAll } = require('./get')

// const publicize = (model, { select }) => {
//   delete model.access_token
// }

const associations = {
  template_instance: {
    model: 'TemplateInstance',
    enabled: false,
    
  },
  user: {
    model: 'User',
    enabled: false,
  }
}

// type, model_name
Orm.register('social_post', 'SocialPost', {
  getAll,
  // publicize,
  associations,
})
