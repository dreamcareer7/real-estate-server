const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const publicize = template => {
  /* This is a hack to make web app work.
   * The lads have mixes up usage of template and template_instance.
   * And template_instance.file is there.
   * When we send a template with file = <something>
   * the treat it like a template_instance and expect template.file.url
   * which doesn't exist.
   */

  delete template.file
}

Orm.register('template', 'Template', {
  getAll,
  publicize
})
