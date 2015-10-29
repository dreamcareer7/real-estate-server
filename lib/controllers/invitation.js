var async = require('async');

function recordInvitation(req, res) {
  var user_id = req.user.id;
  var invitations = req.body.invitations;

  if (!Array.isArray(invitations))
    return res.error(Error.Validation('You must supply an array of invitations'));

  invitations.map(function(r) {
    r.inviting_user = user_id;
  });

  async.map(invitations, Invitation.create, function(err, invitations) {
    if(err)
      return res.error(err);

    return res.collection(invitations);
  });
}

function getUserInvitations(req, res) {
  var user = req.user.id;
  var type = req.query.type;

  Invitation.getForUser(user, type, function(err, invitations) {
    if(err)
      return res.error(err);

    res.collection(invitations);
  });
}

function patchInvitation(req, res) {
  var user = req.user.id;
  var invitation = req.params.id;
  var action = Boolean(req.body.accept);

  Invitation.patch(invitation, action, function(err, invitation) {
    if(err)
      return res.error(err);

    res.model(invitation);
  });
}

function deleteInvitation(req, res) {
  var user = req.user.id;
  var invitation = req.params.id;

  Invitation.delete(invitation, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    res.end();
  });
}

function getRoomInvitations(req, res) {
  var room_id = req.params.id;

  Invitation.getForRoom(room_id, function(err, invitees) {
    if(err)
      return res.error(err);

    res.status(200);
    res.collection(invitees);
  });
}

function searchInvitations(req, res) {
  var email = req.query.email;

  User.getByEmail(email, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      Invitation.getByEmail(email, function(err, invitations) {
        if(err)
          return res.error(err);

        res.status(200);
        res.end();
      });
    } else {
      res.status(204);
      res.end();
    }
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/invitations', b(recordInvitation));
  // app.get('/invitations/search', searchInvitations);
  // app.get('/invitations', b(getUserInvitations));
  // app.get('/rooms/:id/invitations', b(getRoomInvitations));
  // app.patch('/invitations/:id', b(patchInvitation));
  // app.delete('/invitations/:id', b(deleteInvitation));
}

module.exports = router;
