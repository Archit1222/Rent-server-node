const express = require('express')
const app = express()
require('dotenv').config()
const logger = require('morgan')
const fs = require('fs')
const cors = require('cors')
const http = require('http')
const path = require('path')
const server = http.createServer(app)
const io = require('socket.io')(server)
global.io = io

const ejs = require('ejs')

//connecting the database
require('./config/db.config')


const routes = require('./routes/v1/index')
const utils = require('./helpers/utils')

const { responseStatus, messages } = require('./helpers/constant')

const { socketConnection } = require('./controllers/v1/socket.controller')
const { tournamentStuff } = require('./controllers/v1/gamePlayhelper')

//socketConnection()


const PORT = process.env.PORT || 7000


if (!fs.existsSync('public')) fs.mkdir('public', (err) => { if (err) console.log('error=>', err) })

const arr = ['user']
for (let i of arr) {
    if (!fs.existsSync(`public/${i}`)) fs.mkdir(`public/${i}`, (err) => { if (err) console.log('error=>', err) })
}

app.use(cors({
    origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
}))
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

//print api logs on the server 
app.use(logger('dev'))

//serving static files
app.use('/public', express.static('public'))


// set the view engine to ejs
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


app.use((req, res, next) => {
    if (req.body.email) req.body.email = String(req.body.email).toLowerCase()
    if (req.body.offset) req.body.offset = parseInt(req.body.offset)
    if (req.body.limit) req.body.limit = parseInt(req.body.limit)

    if (req.body.search) {
        req.body.search = String(req.body.search)
        req.body.search = utils.escapeSpecialCharacter(req.body.search)
    }
    next()
})

//routes

app.use('/api/v1', routes)
//tournamentStuff()

app.use((err, req, res, next) => {
    console.log(err)
    if (err) return res.status(responseStatus.serverError).json(utils.errorResponse(err))
    else next()
})

//API NOT FOUND

app.use((req, res) => res.status(404).json('server is running.'))

server.listen(PORT,"0.0.0.0", () => console.log(`server is listening on ${PORT}`))



