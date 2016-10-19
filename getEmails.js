'use strict'

var github = require('octonode')
var Kefir = require('kefir')
var R = require('ramda')
var fs = require('fs')

var UserToken = null

if (!UserToken) {
  throw 'GitHub user token is not set. Find more details here: https://help.github.com/articles/creating-an-access-token-for-command-line-use/'
}

var opts = {
  q: 'language:javascript+location:bucharest',
  sort: 'created',
  order: 'asc',
  page: 1,
  per_page: 100
}

var client = github.client(UserToken)
var ghsearch = client.search()

var wrapper = R.curry((cb, err, status) => {
  if (err !== null) {
    throw err
  }

  cb(status)
})

var emails = Kefir.stream(emitter => {
    let pages

    function next() {
      ghsearch.users(opts, wrapper(cb))
    }

    function cb(result) {

      emitter.emit(result.items)

      if (!pages) {
        pages = result.total_count / opts.per_page
      }

      opts.page += 1

      if (opts.page < pages) {
        next()
      } else {
        emitter.end()
      }
    }

    next()

  })
  .flatten()
  .map(R.prop('login'))
  .flatMap(x => Kefir.fromCallback(cb => {
    client.user(x).info(wrapper(cb))
  }))
  .map(R.pick(['email', 'name', 'location', 'blog', 'company']))
  .filter(R.pipe(R.propEq('email', null), R.not))
  .filter(R.propSatisfies(R.contains('@'), 'email'))
  .bufferWhile(R.T)

emails.onValue(x => {
  console.log(`Found ${x.length} emails. Saving them in emails.json`)
  let emails = JSON.stringify(x, null, ' ')
  fs.writeFileSync('./emails.json', emails, 'utf-8')
})

emails.onError(x => console.error(x))

