/**
 * @namespace Email
 */

var sprintf    = require('sprintf-js').sprintf;
var AWS        = require('aws-sdk');
var db         = require('../utils/db.js');
var validator  = require('../utils/validator.js');
var config     = require('../config.js');
var queue      = require('../utils/queue.js');

AWS.config.update({region: config.email.aws_region});
var ses = new AWS.SES({apiVersion: '2010-12-01'});
var mailgun = require('mailgun-js')({apiKey: config.mailgun.api_key, domain: config.mailgun.domain});

Email = {};
SES = {};
Mailgun = {};

var schema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      required: true
    }
  }
};

/**
 * @typedef email_message_body_html
 * @type {object}
 * @memberof SES
 * @instance
 * @property {html} data - inner HTML message
 */

/**
 * @typedef email_message_body_text
 * @type {object}
 * @memberof SES
 * @instance
 * @property {string} data - inner text message
 */

/**
 * @typedef email_message_body
 * @type {object}
 * @memberof SES
 * @instance
 * @property {SES#email_message_body_html} html - HTML wrapper object
 * @property {SES#email_message_body_text} text - text wrapper object
 */

/**
 * @typedef email_message_subject
 * @type {object}
 * @memberof SES
 * @instance
 * @property {string} data - email subject
 */

/**
 * @typedef email_message
 * @type {object}
 * @memberof SES
 * @instance
 * @property {SES#email_message_body} body - full message body
 * @property {SES#email_message_subject} subject - email subject wrapper
 */

/**
 * @typedef email_template_params
 * @type {object}
 * @memberof SES
 * @instance
 * @property {string=} first_name - first name of the user sending the email
 * @property {string=} last_name - last name of the user sending the email
 * @property {string=} invitee_email - email of the user receiving the invitation
 * @property {string=} invitee_first_name - first name of the user receiving invitation
 * @property {string=} invitee_last_name - last name of the user receiving invitation
 * @property {string=} group_title - title of the group
 * @property {number=} user_code - code of the user sending the email
 */

/**
 * @typedef email
 * @type {object}
 * @memberof SES
 * @instance
 * @property {SES#email_message} message - full message object
 * @property {SES#email_template_params} template_params - a _JSON_ object containing values for templates
 * @property {html=} html_body - full HTML body
 * @property {string} from - we send email from this address
 * @property {string} to - we send email to this address
 */

var validate = validator.bind(null, schema);

Email.sane = function(email, cb) {
    process.domain.jobs.push(queue.create('email_sane', email).removeOnComplete(true));
    return cb();
};

Email.sendSane = function(email, cb) { 
  var params = {
    from: email.from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text
  };

  if(email.mailgun_options)
    for(var i in email.mailgun_options)
      params[i] = email.mailgun_options[i];

  mailgun.messages().send(params, function(err, data) {
    if(err)
      console.log('<- (Mailgun-Transport) Error sending email to'.red, email.to[0].yellow, ':', JSON.stringify(err));
    else
      console.log('<- (Mailgun-Transport) Successfully sent an email to'.cyan, email.to[0].yellow);

    return cb(null, data);
  });
}

Email.send = function(email, cb) {
  switch(email.transport) {
  case 'ses':
    process.domain.jobs.push(queue.create('email_ses', email).removeOnComplete(true));
    return cb();
    break;

  case 'mailgun':
  default:
    process.domain.jobs.push(queue.create('email', email).removeOnComplete(true));
    return cb();
    break;
  }
};

/**
 * Sends an email to a recipient using SES service
 * @name sendMail
 * @function
 * @memberof SES
 * @instance
 * @public
 * @param {SES#email} email - full email object
 * @param {callback} cb - callback function
 * @returns {SES#ses_response} full SES response
 */
SES.callSES = function(email, cb) {
  var html_body = Email.parseHTMLBody(email);

  ses.sendEmail({
    Source: email.from,
    Destination: { ToAddresses: email.to },
    Message: {
      Subject: {
        Data: sprintf(email.message.subject.data, email.template_params)
      },
      Body: {
        Html: {
          Data: (email.html_body) ? html_body : '',
          Charset: 'utf-8'
        },
        Text: {
          Data: sprintf(email.message.body.text.data, email.template_params),
          Charset: 'utf-8'
        }
      }
    }
  }, function(err, data) {
    if(err)
      console.log('<- (SES-Transport) Error sending email to'.red, email.to[0].yellow, ':', JSON.stringify(err));
    else
      console.log('<- (SES-Transport) Successfully sent an email to'.cyan, email.to[0].yellow);

    return cb(null, data);
  });
};

/**
 * Sends an email to a recipient using Mailgun service
 * @name callMailgun
 * @function
 * @memberof Mailgun
 * @instance
 * @public
 * @param {Mailgun#email} email - full email object
 * @param {callback} cb - callback function
 * @returns {Mailgun#mailgun_response} full MAILGUN response
 */
Mailgun.callMailgun = function(email, cb) {
  var html_body = Email.parseHTMLBody(email);
  var params = {
    from: email.from,
    to: email.to,
    subject: sprintf(email.message.subject.data, email.template_params),
    html: (email.html_body) ? html_body : '',
    text: sprintf(email.message.body.text.data, email.template_params)
  };

  if(email.mailgun_options)
    for(var i in email.mailgun_options)
      params[i] = email.mailgun_options[i];

  mailgun.messages().send(params, function(err, data) {
    if(err)
      console.log('<- (Mailgun-Transport) Error sending email to'.red, email.to[0].yellow, ':', JSON.stringify(err));
    else
      console.log('<- (Mailgun-Transport) Successfully sent an email to'.cyan, email.to[0].yellow);

    return cb(null, data);
  });
};

Email.parseHTMLBody = function(email) {
  var inner = '';
  var html_body = '';

  if (email.html_body) {
    if(!email.suppress_outer_template) {
      inner = sprintf(email.message.body.html.data, email.template_params);
      html_body = sprintf(email.html_body, {content: inner, _title: email.template_params._title});
    } else {
      html_body = sprintf(email.html_body, email.template_params);
    }
  }

  return html_body;
};

module.exports = function(){};
