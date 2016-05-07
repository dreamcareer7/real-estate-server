var config = require('../config.js');

var actions = {
  '/users/self/profile_image_url' : {
    patch : {
      event:'set-profileimageurl'
    }
  },

  '/users/self/cover_image_url' : {
    patch: {
      event: 'set-coverimageurl'
    }
  },

  '/users/self/timezone' : {
    patch: {
      event: 'set-timezone'
    }
  },

  '/users/self/upgrade' : {
    patch: {
      event: 'upgrade-to-agent',

      triggers: [
        function(definition) {
          var res = this;
          var req = res.req;

          if(res.statusCode > 299)
            return ;

          Intercom.User.tag('Agent', req.user.id)
        }
      ]
    },
  },

  '/users/related/search' : {
    get: {
      event: 'search-related-users'
    }
  },

  '/users/search' : {
    get: {
      event: 'search-users'
    }
  },

  '/users/password' : {
    patch: {
      event: 'reset-password'
    }
  },

  '/users/reset_password' : {
    post: {
      event: 'initiate-reset-password'
    },
  },

  '/users/self' : {
    put: {
      event: 'patch-user'
    },

    'delete': {
      event:'delete-user'
    }
  },

  '/users/self/password' : {
    password: {
      event: 'change-password'
    },
  },

  '/users/self/address' : {
    'delete': {
      event: 'delete-user-address'
    },

    put: {
      event: 'update-user-address'
    }
  },

  '/agents/search' : {
    get : {
      event: 'search-agents'
    },
  },

  '/agents/:id' : {
    get : {
      event: 'get-agent'
    },
  },

  '/agents/report' : {
    post: {
      event: 'generate-agent-report'
    },
  },

  '/alerts' : {
    post: {
      event: 'create-alerts'
    }
  },

  '/valerts' : {
    post: {
      event: 'search-map'
    }
  },

  '/rooms/:id/alerts' : {
    post: {
      event: 'create-alert'
    }
  },

  '/rooms/:rid/alerts/:id' : {
    put: {
      event: 'patch-alert'
    },

    'delete': {
      event: 'delete-alert'
    }
  },

  '/alerts/search' : {
    get: {
      event: 'search-alerts'
    }
  },

  '/agents/search' : {
    'get' : {
      event: 'search-agent',
    }
  },

  '/agents/report' : {
    'post' : {
      event: 'generate-agent-report',
    }
  },

  '/rooms/:id/cmas' : {
    'post' : {
      event: 'create-cma',
    }
  },

  '/rooms/:rid/cmas/:id' : {
    'post' : {
      event: 'delete-cma',
    }
  },

  '/cmas' : {
    'post' : {
      event: 'bulk-share-cma',
    }
  },

  '/contacts/search' : {
    'get' : {
      event: 'search-contacts',
    }
  },

  '/contacts' : {
    'post' : {
      event: 'add-contacts',
    }
  },

  '/contacts/:id' : {
    'put' : {
      event: 'update-contact',
    },

    'delete': {
      event: 'delete-contact'
    }
  },

  '/contacts/:id/tags' : {
    'post' : {
      event: 'tag-contact',
    }
  },

  '/contacts/:id/tags/:tid' : {
    'post' : {
      event: 'untag-contact',
    }
  },

  '/transactions/:id/tags/date' : {
    'post' : {
      event: 'create-date',
    }
  },

  '/dates/:id' : {
    'put' : {
      event: 'update-date'
    },

    'delete' : {
      event: 'delete-date',
    }
  },

  '/invitations' : {
    'post' : {
      event: 'invite-users',
    }
  },

  '/listings/search' : {
    'get' : {
      event: 'search-listings',
    }
  },

//   '/rooms/:id/messages' : {
//     'post' : {
//       event: 'post-message',
//     }
//   },

  '/offices/search' : {
    'get' : {
      event: 'search-offices',
    }
  },

  '/rooms/:id/recs' : {
    'post' : {
      event: 'recommend-listing',
    }
  },

  '/recs' : {
    'post' : {
      event: 'recommend-listings',
    }
  },

  '/rooms/:rid/recs/feed/:id' : {
    'delete' : {
      event: 'mark-as-read-recommendation',
    }
  },

  '/rooms/:rid/recs/:id/favorite' : {
    'patch' : {
      event: 'favorite-recommendation',
    }
  },

  '/rooms/:rid/recs/:id/tour' : {
    'patch' : {
      event: 'tour-recommendation',
    }
  },

  '/rooms/search' : {
    'get' : {
      event: 'search-rooms',
    }
  },

  '/rooms' : {
    'post' : {
      event: 'create-room',
    }
  },

  '/rooms/:id' : {
    'put' : {
      event: 'update-room',
    },

    'delete' : {
      event: 'delete-room'
    }
  },

  '/rooms/:id/users' : {
    'post' : {
      event: 'add-room-member',
    }
  },

  '/rooms/:rid/users/:id' : {
    'delete' : {
      event: 'remove-room-member'
    }
  },

  '/tasks' : {
    'post' : {
      event: 'create-task'
    }
  },

  '/tasks/:id' : {
    'delete' : {
      event: 'delete-task'
    },

    'put' : {
      event: 'update-task'
    }
  },

  '/tasks/:id/contacts' : {
    'post' : {
      event: 'assign-task'
    }
  },

  '/tasks/:id/contacts/:rid' : {
    'delete' : {
      event: 'withdraw-task'
    }
  },

  '/tasks/:id/attachments' : {
    'post': {
      event: 'attach-to-task'
    }
  },

  'tasks/:id/attachments/:aid': {
    'delete': {
      event: 'detach-from-task'
    }
  },

  '/transactions' : {
    'post' : {
      event: 'create-transaction'
    }
  },

  '/transactions/:id': {
    'delete' : {
      event: 'delete-transaction'
    },

    'put' : {
      event: 'update-transaction'
    }
  },

  '/transactions/:id/roles' : {
    'post' : {
      event: 'assign-transaction'
    }
  },

  '/transactions/:id/roles/:rid' : {
    'post' : {
      event: 'withdraw-transaction'
    }
  },

  '/transactions/:id/attachments' : {
    'post' : {
      event: 'attach-to-transaction'
    }
  },

  '/transactions/:id/attachments/:rid' : {
    'delete' : {
      event: 'detach-from-transaction'
    }
  },

  '/transactions/:id/notes' : {
    'post' : {
      event: 'note-on-transaction'
    }
  },

  '/transactions/:id/notes/:nid' : {
    'post' : {
      event: 'delete-note-from-transaction'
    }
  },

  '/phone_verifications' : {
    'post' : {
      event: 'request-phone-verification'
    }
  },

  '/email_verifications' : {
    'post' : {
      event: 'request-email-verification'
    }
  },

  '/users/phone_confirmed': {
    patch: {
      event: 'verified-phone'
    }
  },

  '/users/email_confirmed': {
    patch: {
      event: 'verified-email'
    }
  }
}

var reportAction = function(definition) {
  var req = this.req;
  var res = this;

  if(!req.user)
    return ;

  if(res.statusCode > 299)
    return ;

  Intercom.Event.create({
    event:definition.event,
    user:req.user,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    agent:req.headers['user-agent']
  });
}

if(config.intercom.enabled)
  Message.on('new message', (data) => {
    var message = data.message;
    if(!message.author)
      return ;


    Intercom.User.update(message.author)

    Intercom.Event.create({
      event: 'post-message',
      user: message.author,
    })
  })

module.exports = app => {
  if(!config.intercom.enabled)
    return ;

  Object.keys(actions).forEach( uri => {
    app.use(uri, (req, res, next) => {
      var method = req.method.toLowerCase();
      var definition = actions[uri][method]

      if(!definition)
        return next();

      var triggers = definition.triggers;
      if(!triggers)
        triggers = [];

      if(definition.event)
        triggers.push(reportAction);

      triggers.forEach(trigger => {
        res.on('finish', trigger.bind(res, definition));
      });

      next();
    })
  })
}
