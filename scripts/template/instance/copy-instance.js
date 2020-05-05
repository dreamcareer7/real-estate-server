#!/usr/bin/env node

/* Copies a TemplateInstance from a user for another.
/* Usage: node copy-instance.js <template-id> <email-address>
 */

require('../../connection.js')
require('../../../lib/models/index.js')

const update = async () => {
  const instance = await TemplateInstance.get(process.argv[2])
  const template = await Template.get(instance.template)
  const user = await User.getByEmail(process.argv[3])

  const copy = {
    ...instance,
    template,
    created_by: user
  }

  console.log(copy)

  const saved = await TemplateInstance.create(copy)

  console.log(saved)

  process.exit()
}

update()
  .catch(e => {
    console.log(e)
    process.exit()
  })
