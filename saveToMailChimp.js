var mailchimp = require('mailchimp-v3');
var fs = require('fs')
var R = require('ramda')

var MailChimpToken = null
var ListId = null

if (!MailChimpToken) {
  throw 'MailChimp token is not set. Find more details here: http://kb.mailchimp.com/integrations/api-integrations/about-api-keys'
}

if (!ListId) {
  throw 'MailChimp List id is not set. Please provide a list id. Find more details here: http://kb.mailchimp.com/lists/managing-subscribers/find-your-list-id'
}

mailchimp.setApiKey(MailChimpToken)

var batch = mailchimp.createBatch(`lists/${ListId}/members`, 'POST');
var users = JSON.parse(fs.readFileSync('./emails.json', 'utf-8'))

var batches = users.map(x => ({
  body: {
    status: 'subscribed',
    email_address: x.email,
    merge_fields: {
      FNAME: R.ifElse(R.pipe(R.isNil, R.not), R.pipe(R.split(' '), R.head), R.always(''))(x.name),
      LNAME: R.ifElse(R.pipe(R.isNil, R.not), R.pipe(R.split(' '), R.tail, R.join(' ')), R.always(''))(x.name),
    }
  }
}))


batch
  .add(batches)
  .send()
  .then(function(result){
    console.log(result);
  })
  .catch(function(error){
    console.log(error);
  })
