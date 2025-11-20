const { socketUserAuthentication } = require('../../middlewares/auth')
const userSchema = require('../../models/user.model')
const { randomMatch, bidRound, bidCard, selfExit, playCard, disconnectUser, requestStatus, onMaximize, chat, changeLanguage, gameWinSuccess,sendMessage } = require('./gamePlay.controller')
const { socketConstants, messages, swMessages, getBadge } = require('../../helpers/constant')
const { lastGameStatus } = require('./gamePlayhelper')

module.exports.socketConnection = () => {
    const io = global.io
    io.use(socketUserAuthentication)

    io.on('connection', (socket) => {
        const socketId = socket?.id
       // const { _id,  userName } = socket.user
        console.log('::: Connection ::: ',socketId)
0
        // userSchema.findOne({ _id, deviceToken: socket.deviceToken }).then(success => {
        //     if (!success) io.to(socketId).emit(socketConstants.error, { message: language == 'en' ? messages.deviceErr : swMessages.deviceErr, status: 401 })
        // })

        //internet on connect case
       // if (isBlock) return io.to(socketId).emit(socketConstants.error, { message: language == 'en' ? messages.blocked : swMessages.blocked, status: 401 })

        //io.to(socketId).emit(socketConstants.coinsUpdate, { coins, badge: getBadge(coins, false) })
        //send message

        socket.on(socketConstants.sendMessage, (data) => sendMessage(socketId, socket.user, io, data))

        // socket.on(socketConstants.randomMatch, (data) => randomMatch(socketId, socket.user, io, data, true))

        // socket.on(socketConstants.bidRound, (data) => bidRound(socket.user, _id, io, data))

        // socket.on(socketConstants.bidCard, (data) => bidCard(socket.user, _id, io, data))

        // socket.on(socketConstants.playCard, (data) => playCard(socket.user, _id, io, data))

        // socket.on(socketConstants.requestStatus, (data) => requestStatus(socket.user, io, data))

        // socket.on(socketConstants.selfExit, () => selfExit(socket.user, io))

        // socket.on(socketConstants.gameState, () => onMaximize(socket.user, io))

        // socket.on(socketConstants.chat, (emoji) => chat(io, _id, emoji))

        // socket.on(socketConstants.setLanguage, (language) => changeLanguage(io, _id, language))

        // socket.on(socketConstants.gameWinSuccess, () => gameWinSuccess(_id))

        socket.on('disconnect', async () => disconnectUser(socketId, io))
    })

}