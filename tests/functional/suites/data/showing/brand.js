const emails = require('./emails')

module.exports = {
  name: 'Showings Parent Brand',
  brand_type: 'Office',
  roles: {
    Admin: [emails.admin],
  },

  children: [{
    name: 'Showings Child Brand',
    brand_type: 'Team',
    roles: {
      Agent: { acl: ['Showings'], members: [emails.agent] }
    },
  }],
}
