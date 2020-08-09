const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('contact_list', 'ContactList', {
  getAll,
  associations: {
    flows: {
      model: 'BrandFlow',
      enabled: false,
      collection: true,
      /**
       * @param {{ args: { flows: any; }; }} list
       * @param {(err: any, arg1: UUID[] | undefined) => void} cb
       */
      ids(list, cb) {
        cb(null, list.args.flows)
      }
    },
    crm_tasks: {
      model: 'CrmTask',
      enabled: false,
      collection: true,
      /**
       * @param {IContactList} list
       * @param {(err: any, arg1: UUID[] | undefined) => void} cb
       */
      ids(list, cb) {
        cb(null, list.args.crm_tasks)
      }
    }
  }
})
