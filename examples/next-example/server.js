const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

//populates global.serverFirebase so components can access the firebase-admin for server-side rendering
require('./serverFirebase')

app.prepare()
  .then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
    })
      .listen(3000, (err) => {
        if (err) throw err
        console.log('> Ready on http://localhost:3000')
      })
  })