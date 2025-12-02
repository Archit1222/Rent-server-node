const matchSchema = require('../../models/match.model')
const tournamentSchema = require('../../models/tournament.model')
// const { IntervalForRandomMatch, timeOutForRandomMatch, getRandomNumberFromArray } = require('./gamePlayhelper')
const gamePlayhelper = require('./gamePlayhelper')
const userSchema = require('../../models/user.model')
const shopSchema = require('../../models/shop.model')
const { generateRandomSuite, cards, distributeCards } = require('../v1/cards')
const { socketConstants, messages, swMessages, getBadge } = require('../../helpers/constant')
const gameRequestSchema = require('../../models/gamerequest.model')
const blockSchema = require('../../models/block.model')
const utils = require('../../helpers/utils')

const messageSchema = require("../../models/messageSchema");
const mongoose= require("mongoose")

module.exports.sendMessage = async (socket, user, io, data) => {
    try {
        const { receiverId, message,shopId } = data;
        const senderId = user._id;

        if (!receiverId || !message?.trim()) {
            return io.to(socket).emit("error", {
                status: 400,
                message: "Receiver and message text required"
            });
        }

         if (!shopId) {
            return io.to(socket).emit("error", {
                status: 400,
                message: "shopId is required."
            });
        }

         // Check shop exists
        const shop = await shopSchema.findOne({ _id: shopId }).lean();
        if (!shop) {
            return io.to(socket).emit("error", {
                status: 400,
                message: "Receiver not found"
            });
        }

        // Check receiver exists
        const receiver = await userSchema.findOne({ _id: receiverId }).lean();
        if (!receiver) {
            return io.to(socket).emit("error", {
                status: 400,
                message: "Receiver not found"
            });
        }

        // Save message in DB
        const messageDoc = await messageSchema.create({
            senderId,
            receiverId,
            message
        });

        // // Acknowledge back to sender
        io.to(socket).emit("newMessage", {
            message:"Dummy text message for testing only."
        });

        // Send message to receiver (if user is online)
        if (receiver.socketId) {
            io.to(receiver.socketId).emit("newMessage", {
                _id: messageDoc._id,
                message,
                sender:user,
                shop:shop,
                createdAt: messageDoc.createdAt
            });
        }

    } catch (error) {
        console.log("Message Error:", error);

        io.to(socket).emit("error", {
            status: 500,
            message: "Internal server error"
        });
    }
};


module.exports.chatList = async (socket, user, io, data) => {
    try {
        let {offset,limit}=data
        if(!offset) offset=0
        if(!limit) limit=10
        const userId= mongoose.Types.ObjectId(user._id)
         console.log("chatList=>data",data)
        
        const chatList = await messageSchema.aggregate([
        {
                $match: {
                    $or: [
                    { senderId: userId },
                    { receiverId: userId }
                    ]
                }
        },
        {
        // Create a consistent chat key so sender-receiver order doesn't matter
            $addFields: {
                chatUser: {
                $cond: [
                    { $eq: ["$senderId", new mongoose.Types.ObjectId(userId)] },
                    "$receiverId",
                    "$senderId"
                ]
                }
            }
        },
        {
        $sort: { createdAt: -1 } // sort latest first before grouping
        },
        {
            $group: {
                _id: "$chatUser",
                lastMessage: { $first: "$message" },
                lastMessageTime: { $first: "$createdAt" },
                lastSender: { $first: "$senderId" },
                unreadCount: {
                $sum: {
                    $cond: [
                    {
                        $and: [
                        { $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)] },
                        { $eq: ["$isRead", false] }
                        ]
                    },
                    1,
                    0
                    ]
                }
                }
            }
        },
        {
        // Join user info
            $lookup: {
                from: "users",
                localField: "_id",
                // pipeline:[
                //     {
                //         $lookup:{
                //             from:"files",
                //             localField:"profileImage",
                //             foreignField:"_id",
                //             as:"profileImage"
                //         }
                //     },
                //     {$unwind:{path:"$profileImage"}}
                // ],
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: "$user" },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                userName: "$user.userName",   // change field as per your user schema
                profileImage: "$user.profileImage", // optional
                lastMessage: 1,
                lastMessageTime: 1,
                unreadCount: 1
            }
        },
        {
           $sort: { lastMessageTime: -1 } // latest chat on top
        },
        { $skip: offset },
        { $limit: limit }
        ]);

         const totalUsers = await messageSchema.aggregate([
            {
            $match: {
                $or: [
                { senderId: userId },
                { receiverId: userId }
                ]
            }
            },
            {
            $addFields: {
                chatUser: {
                $cond: [
                    { $eq: ["$senderId", userId] },
                    "$receiverId",
                    "$senderId"
                ]
                }
            }
            },
            {
            $group: { _id: "$chatUser" }
            },
            { $count: "total" }]);

        io.to(socket).emit('chatList',{
             totalCount: totalUsers[0]?.total || 0,
             chatList
        })

    } catch (error) {
        console.log("Message Error:", error);

        io.to(socket).emit("error", {
            status: 500,
            message: "Internal server error"
        });
    }
};


module.exports.chatHistory = async (socket, user, io, data) => {
    try {
        
        let offset= data.offset || 0

        let limit=data.limit || 10

        console.log("chatHistory=>data",data)

        let loggedInUserId =mongoose.Types.ObjectId(user._id)
        let otherUserId = mongoose.Types.ObjectId(data.userId)

        const history = await messageSchema.aggregate([
            {
                $match: {
                    $or: [
                    { senderId: loggedInUserId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: loggedInUserId }
                    ]
                }
            },
            {
                $addFields: {
                    selfMessage: { $eq: ["$senderId", loggedInUserId] }
                }
            },
            {
                $project: {
                    _id: 0,
                    messageId: "$_id",
                    message: 1,
                    createdAt: 1,
                    selfMessage: 1
                }
            },
            // { $sort: { createdAt: -1 } }, // latest first
            { $skip: offset },
            { $limit: limit },
            //{ $sort: { createdAt: 1 } } // return in chronological order
        ]);

        const totalMessages = await messageSchema.aggregate([{
            $match:{
                $or: [
                    { senderId: loggedInUserId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: loggedInUserId }
                ]
         }
        }]);

        console.log("chatHistoryRES",{
             totalCount:totalMessages.length,
             chatHistory:history
        })


        io.to(socket).emit('chatHistory',{
             totalCount:totalMessages.length,
             chatHistory:history
        })

    } catch (error) {
        console.log("Message Error:", error);

        io.to(socket).emit("error", {
            status: 500,
            message: "Internal server error"
        });
    }
};



module.exports.randomMatch = async (socket, user, io, data, isJoined = false) => {
    let { coins, tournament } = data
    const { _id: userId, language } = user
    console.log('randomMatch', data, ":::::::::::::::", user.userName)
    //check for already exists match
    let [alreadyExistsMatch, userData] = await Promise.all([
        matchSchema.findOne({ players: userId, endTime: null }),
        await userSchema.findOne({ _id: userId, socketId: { $ne: null } }).lean()

    ])
    if (!userData) return
    if (!alreadyExistsMatch) {
        if (tournament) {
            setTimeout(async () => {
                const tournamentDetail = await tournamentSchema.findOne({ _id: tournament, isEnd: false, exitPlayers: { $ne: userId } })
                console.log('tournamentDetail', tournamentDetail?._id, user.userName)
                if (isJoined) await userSchema.updateOne({ _id: userId }, { totalWins: 0 })
                if (tournamentDetail) {

                    // const alreadyPlayed = [userId, ...(userDetail?.alreadyPlayed || [])]
                    const [vacantSpace] = await Promise.all([
                        matchSchema.findOne({
                            tournament,
                            startTime: null,
                            endTime: null,
                            players: { $ne: userId },
                            $expr: { $lt: [{ $size: '$players' }, 2] },
                        }).populate('players'),
                        userSchema.updateOne({ _id: userId }, { $set: { inMatch: true, lastMatch: 'tournament', onHomePage: false } })
                    ])
                    if (vacantSpace) {
                        console.log('vacantSpace', user.userName)

                        const getRandomNumberFromArray = (arr) => {
                            const randomIndex = Math.floor(Math.random() * arr.length);
                            const randomValue = arr[randomIndex];
                            return randomValue;
                        }
                        const { deck, player1, player2 } = distributeCards()
                        const opponent = vacantSpace.players[0]
                        const userCards = {
                            playerId: userId,
                            cards: player1
                        }
                        const opponentCards = {
                            playerId: opponent._id,
                            cards: player2
                        }
                        const bulk = [
                            { updateOne: { filter: { _id: userId }, update: { $addToSet: { alreadyPlayed: opponent?._id } } } },
                            { updateOne: { filter: { _id: opponent?._id }, update: { $addToSet: { alreadyPlayed: userId } } } }
                        ]
                        const [updatedDetail, matchDetail] = await Promise.all([
                            tournamentSchema.findOneAndUpdate({ _id: tournamentDetail?._id }, { $addToSet: { joinedPlayers: userId } }, { returnOriginal: false }).select('name winningAmount totalPlayers joinedPlayers exitPlayers').populate('joinedPlayers'),
                            matchSchema.findOneAndUpdate({ _id: vacantSpace?._id }, { $addToSet: { players: userId }, player1: userCards, player2: opponentCards, deck, turn: getRandomNumberFromArray([userId, opponent._id]), startTime: new Date() }, { returnOriginal: false }).select('deck bidRound players player1 player2 turn').populate('players'),
                            userSchema.bulkWrite(bulk)
                        ])
                        const fixture = await gamePlayhelper.tournamentFixture(updatedDetail)

                        console.log('updatedDetail', updatedDetail.joinedPlayers, user.userName)

                        updatedDetail.joinedPlayers.map(x => {
                            if (!updatedDetail?.exitPlayers?.includes(utils.parseMongoId(x._id))) {
                                console.log("::::::fixtureScreen:::::", x.userName, x.socketId)
                                const updatedFixture = []
                                fixture.map(i => { updatedFixture.push({ ...i, status: { ...i.status, message: x.language == 'en' ? messages[i.status.message] : swMessages[i.status.message] } }) })
                                io.to(x.socketId).emit(socketConstants.fixtureScreen, { fixture: updatedFixture, tournament: { ...updatedDetail._doc, joinedPlayers: updatedDetail?.joinedPlayers?.length || 0 } })
                            }
                        })

                        matchDetail.players.map(x => {
                            const opponent = matchDetail.players.find(i => { if (String(i._id) != String(x._id)) return i })
                            console.log("::::::opponent:::::", opponent.userName, opponent.socketId)

                            io.to(x.socketId).emit(socketConstants.opponentFound, {
                                status: true,
                                userName: opponent.userName,
                                profileImage: opponent.profileImage,
                                avatar: opponent.avatar,
                                badge: getBadge(opponent?.coins, false)
                            })
                        })
                        delete matchDetail._doc['players']
                        const player1Cards = matchDetail.player1.cards
                        const player2Cards = matchDetail.player2.cards

                        delete matchDetail.player1.cards
                        delete matchDetail.player2.cards

                        global[matchDetail._id] = setTimeout(async () => {
                            io.to(socket).emit(socketConstants.gameStart, {
                                ...matchDetail._doc, cards: player1Cards, opponentCards: player2Cards,
                                opponentInfo: {
                                    _id: opponent._id,
                                    userName: opponent.userName,
                                    profileImage: opponent.profileImage,
                                    avatar: opponent.avatar,
                                    badge: getBadge(opponent?.coins, false)
                                }
                            })
                            io.to(opponent.socketId).emit(socketConstants.gameStart, {
                                ...matchDetail._doc, cards: player2Cards, opponentCards: player1Cards,
                                opponentInfo: {
                                    _id: user._id,
                                    userName: user.userName,
                                    profileImage: user.profileImage,
                                    avatar: user.avatar,
                                    badge: getBadge(user?.coins, false)
                                }
                            })

                            setTimeout(async () => {
                                const matchDetails = await matchSchema.findOne({ _id: matchDetail._id, endTime: null }, { turn: 1 }).lean()
                                // console.log('matchDetails111111', matchDetails._id, matchDetails.turn)
                                if (matchDetails) {
                                    // console.log('matchDetails11111', matchDetails._id,)
                                    io.to(socket).emit(socketConstants.playBidturn, {
                                        playBidTurn: true,
                                        turn: String(matchDetails.turn)
                                    })

                                    io.to(opponent.socketId).emit(socketConstants.playBidturn, {
                                        playBidTurn: true,
                                        turn: String(matchDetails.turn)
                                    })

                                    this.skipBidTurn(matchDetails.turn, io)
                                }
                            }, 4000)
                        }, 3000)


                    } else {
                        console.log('vacantSpace elseeeee')

                        const [updatedDetail] = await Promise.all([
                            tournamentSchema.findOneAndUpdate({ _id: tournamentDetail?._id }, { $addToSet: { joinedPlayers: userId } }, { returnOriginal: false }).select('name winningAmount totalPlayers joinedPlayers exitPlayers registerCoins').populate('joinedPlayers'),
                            matchSchema({ tournament, players: [userId] }).save(),
                        ])

                        const fixture = await gamePlayhelper.tournamentFixture(updatedDetail)
                        updatedDetail.joinedPlayers.map(x => {
                            const updatedFixture = []
                            fixture.map(i => { updatedFixture.push({ ...i, status: { ...i.status, message: x.language == 'en' ? messages[i.status.message] : swMessages[i.status.message] } }) })
                            if (!updatedDetail?.exitPlayers.includes(utils.parseMongoId(x._id))) io.to(x.socketId).emit(socketConstants.fixtureScreen, { fixture: updatedFixture, tournament: { ...updatedDetail._doc, winningAmount: (updatedDetail.registerCoins * updatedDetail?.totalPlayers) * 0.75, joinedPlayers: updatedDetail?.joinedPlayers?.length || 0 } })
                        })
                    }
                }
            }, Math.floor(Math.random() * (1000 - 300 + 1)) + 300)
        }
        else {
            //check for suffiscent coins
            const userDetails = await userSchema.findOne({ _id: userId })

            if (userDetails?.coins >= coins) {
                //creating a match document in match

                //send ack to the user
                io.to(socket).emit(socketConstants.findMatchSuccess, {})

                gamePlayhelper.IntervalForRandomMatch(userId, io, socket, coins)

            }
            else io.to(socket).emit(socketConstants.error, { message: userDetails?.language == "en" ? messages?.insufficentCoins : swMessages?.insufficentCoins, status: 400 })
        }
    } else io.to(socket).emit(socketConstants.error, { message: language == "en" ? messages.alreadyInMatch : swMessages.alreadyInMatch, status: 400 })

}

const getCardSuite = (card) => {
    const cardSuit = card.charAt(0)
    switch (cardSuit) {
        case "H":
            return "Heart"

        case "D":
            return "Diamond"

        case "C":
            return "Club"

        case "S":
            return "Spade"

        default:
            break;
    }
}

const cardForSkipTurn = async (userId, cards, io) => {
    console.log(':::: cards:::', cards.map(e => e.value))

    const key = utils.generateRandomKey()
    const timerStartTime = Date.now()
    const currentUser = await userSchema.findOneAndUpdate({ _id: userId }, { bidCardTimeOut: key }, { new: true })

    await matchSchema.updateOne({ players: { $in: [userId] }, startTime: { $ne: null }, endTime: null, bidRound: false }, { timerStartTime })

    global[key] = setTimeout(async () => {
        const card = await gamePlayhelper.getRandomNumberFromArray(cards)

        this.playCard(currentUser, userId, io, { card: card?.value })
    }, parseInt(process.env.MATCH_TURN_TIME))

}

module.exports.skipBidTurn = async (userId, io) => {
    console.log(':::: skip bid turn ::::')

    const key = utils.generateRandomKey()
    const timerStartTime = Date.now()
    const updatedUser = await userSchema.findOneAndUpdate({ _id: userId }, { bidCardTimeOut: key }, { new: true })

    await matchSchema.updateOne({ players: { $in: [userId] }, startTime: { $ne: null }, endTime: null, bidRound: true, }, { timerStartTime })

    global[key] = setTimeout(() => {
        this.bidRound(updatedUser, userId, io, { status: false })
    }, parseInt(process.env.MATCH_TURN_TIME))
}

module.exports.bidRound = async (currentUser, userId, io, data) => {
    console.log(':::: bid round ::::')

    currentUser = await userSchema.findOne({ _id: currentUser?._id })

    currentUser.bidCardTimeOut ? clearTimeout(global[currentUser.bidCardTimeOut]) : null

    const { status } = data
    const activeMatchDetails = await matchSchema.findOne({
        players: { $in: [userId] }, startTime: { $ne: null },
        endTime: null,
        bidPlayers: { $nin: [userId] }
    })
    if (activeMatchDetails) {
        //get opponent player Id and details
        const opponentPlayerId = activeMatchDetails.players.find((e) => e.toString() != userId.toString())
        const opponentPlayer = await userSchema.findOne({ _id: opponentPlayerId })
        const updatedMatchData = await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, { $addToSet: { bidPlayers: userId }, timerStartTime: new Date() }, { new: true })
        const currentUserSocketId = currentUser.socketId
        const opponentSocketId = opponentPlayer.socketId
        const playerKey = String(activeMatchDetails.player1.playerId) == String(currentUser._id) ? 'player1' : 'player2'
        const opponentKey = playerKey === "player1" ? "player2" : "player1"

        if (status) {
            const key = utils.generateRandomKey()
            await userSchema.updateOne({ _id: currentUser._id }, { bidCardTimeOut: key })

            global[key] = setTimeout(async () => {
                let firstCardPlayed = updatedMatchData[playerKey == "player1" ? "player2" : "player1"].cardPlayed
                let cards = activeMatchDetails[playerKey].cards.filter((e) => e.suit != firstCardPlayed.suit)
                const card = await gamePlayhelper.getRandomNumberFromArray(cards)
                this.bidCard(currentUser, userId, io, { card: card.value })
            }, parseInt(process.env.MATCH_TURN_TIME))
            io.to(currentUserSocketId).emit(socketConstants.playBidCard, {
                playBidCard: true,
                turn: userId
            })

            io.to(opponentSocketId).emit(socketConstants.playBidCard, {
                playBidCard: true,
                turn: userId
            })

        }
        else {
            if (updatedMatchData.bidPlayers.length == 2) {
                const turn = await gamePlayhelper.getRandomNumberFromArray([opponentPlayerId, userId])
                const firstPlayerCardPlayed = updatedMatchData[playerKey == "player1" ? "player2" : "player1"].cardPlayed
                const firstPlayerId = updatedMatchData[playerKey == "player1" ? "player2" : "player1"].playerId
                if (firstPlayerCardPlayed && firstPlayerCardPlayed.name) {
                    let randomDeckCard = await gamePlayhelper.getRandomNumberFromArray(activeMatchDetails.deck)

                    let dominantSuite = getCardSuite(randomDeckCard.value)

                    let updateObject = Object.assign({})

                    let bidWinner = null

                    if (randomDeckCard.suit == firstPlayerCardPlayed.suit) {
                        //replace the card 
                        bidWinner = firstPlayerId
                        dominantSuite = getCardSuite(firstPlayerCardPlayed.value)

                        await matchSchema.updateOne({ _id: activeMatchDetails._id }, {
                            $pull: {
                                deck: { _id: randomDeckCard._id },
                            },
                        })

                        updateObject = {
                            $addToSet: {
                                deck: firstPlayerCardPlayed,
                            }
                        }
                    }

                    await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, {
                        bidRound: false, turn: null, dominantSuite, round: 1,
                        turns: [turn],
                        turn: null,
                        $set: { 'player1.cardPlayed': {}, 'player2.cardPlayed': {} },
                        ...updateObject
                    }, { new: true })


                    const matchDetailsObj = { dominantSuite, bidRound: false, randomCardFromDeck: randomDeckCard, bidWinner }

                    io.to(currentUserSocketId).emit(socketConstants.updatedMatchDetails, matchDetailsObj)

                    io.to(opponentSocketId).emit(socketConstants.updatedMatchDetails, matchDetailsObj)


                    setTimeout(async () => {
                        const updatedMatch = await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, {
                            turn
                        }, { new: true })
                        const turnUser = String(updatedMatch.turn)
                        io.to(currentUserSocketId).emit(socketConstants.gameTurn, { turn: turnUser })

                        io.to(opponentSocketId).emit(socketConstants.gameTurn, { turn: turnUser })

                        const cards = String(updatedMatch[playerKey].playerId) === turnUser ? updatedMatch[playerKey].cards : updatedMatch[opponentKey].cards

                        cardForSkipTurn(turnUser, cards, io)
                    }, 4000)
                }
                else {
                    const dominantSuite = generateRandomSuite()

                    await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, {
                        bidRound: false, dominantSuite,
                        turn: null,
                        turns: [turn],
                        $set: { 'player1.cardPlayed': {}, 'player2.cardPlayed': {} },
                    }, { new: true })

                    const matchDetailsObj = {
                        dominantSuite, bidRound: false, bidWinner: null,
                        randomDeckCard: null
                    }

                    io.to(currentUserSocketId).emit(socketConstants.updatedMatchDetails, matchDetailsObj)

                    io.to(opponentSocketId).emit(socketConstants.updatedMatchDetails, matchDetailsObj)

                    setTimeout(async () => {
                        const updatedMatch = await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, {
                            turn: turn,
                        }, { new: true })
                        const turnUser = String(updatedMatch.turn)

                        io.to(currentUserSocketId).emit(socketConstants.gameTurn, { turn: turnUser })

                        io.to(opponentSocketId).emit(socketConstants.gameTurn, { turn: turnUser })

                        const cards = String(updatedMatch[playerKey].playerId) === turnUser ? updatedMatch[playerKey].cards : updatedMatch[opponentKey].cards

                        cardForSkipTurn(turnUser, cards, io)
                    }, 2000)

                }


            }
            else {
                setTimeout(() => {

                    matchSchema.updateOne({ _id: activeMatchDetails._id }, { turn: opponentPlayerId }).then()

                    io.to(opponentSocketId).emit(socketConstants.playBidturn, { playBidTurn: true, turn: String(opponentPlayerId) })

                    io.to(currentUserSocketId).emit(socketConstants.playBidturn, { playBidTurn: true, turn: String(opponentPlayerId) })

                    this.skipBidTurn(opponentPlayerId, io)

                }, 500);
            }
        }
    }
}

module.exports.bidCard = async (currentUser, userId, io, card) => {
    console.log(':::: bid card ::::')

    currentUser = await userSchema.findOne({ _id: currentUser._id })

    const activeMatchDetails = await matchSchema.findOne({
        players: { $in: [userId] }, startTime: { $ne: null },
        endTime: null,
        bidRound: true,
        bidPlayers: { $in: [userId] }
    })

    if (activeMatchDetails) {

        const opponentPlayerId = activeMatchDetails.players.find((e) => e.toString() != userId.toString())
        const opponentPlayer = await userSchema.findOne({ _id: opponentPlayerId })

        const currentUserSocketId = currentUser.socketId
        const opponentSocketId = opponentPlayer.socketId


        const randomCardFromDeck = await gamePlayhelper.getRandomNumberFromArray(activeMatchDetails.deck)

        let dominantSuite = randomCardFromDeck.suit


        const bidRound = activeMatchDetails.bidPlayers.length > 1 ? false : true

        let playerToUpdate = String(activeMatchDetails.player1.playerId) === String(userId) ? "player1" : "player2"

        let opponentKey = playerToUpdate == "player1" ? "player2" : "player1"

        // check for card exists with the player
        const cardExistsforPlayer = activeMatchDetails[playerToUpdate].cards.findIndex(e => e.value === card.card)


        if (cardExistsforPlayer > -1) {
            //UPDATE PLAYED Card

            const match = await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, {
                [`${playerToUpdate}.cardPlayed`]: cards.find(e => e.value == card.card),
                turn: opponentPlayerId
            }, { new: true })


            const selfCardPlayedSuite = getCardSuite(match[playerToUpdate].cardPlayed.value)
            const opponentCardPlayedSuite = match[playerToUpdate == "player1" ? 'player2' : 'player1'].cardPlayed.value ? getCardSuite(match[playerToUpdate == "player1" ? 'player2' : 'player1'].cardPlayed.value) : null
            const opponentCard = match[playerToUpdate == "player1" ? 'player2' : 'player1'].cardPlayed.value

            if (selfCardPlayedSuite != opponentCardPlayedSuite) {

                io.to(currentUserSocketId).emit(socketConstants.playCard, {
                    turn: String(currentUser._id),
                    card: card.card
                })

                io.to(opponentSocketId).emit(socketConstants.playCard, {
                    turn: String(currentUser._id),
                    card: card.card
                })

                userSchema.updateOne({ _id: currentUser._id }, { bidCardTimeOut: null }).then()

                global[currentUser.bidCardTimeOut] ? clearTimeout(global[currentUser.bidCardTimeOut]) : null


                if (activeMatchDetails.bidPlayers.length > 1) {

                    let noUpdateCond = false
                    let suitsCond = false
                    let bidWinner = null
                    let updateFurther = null

                    if (selfCardPlayedSuite == randomCardFromDeck.suit) {
                        suitsCond = true
                        bidWinner = String(currentUser._id)
                        dominantSuite = selfCardPlayedSuite
                        updateFurther = playerToUpdate

                        //update Deck
                        await matchSchema.updateOne({ _id: activeMatchDetails._id }, {
                            $pull: {
                                deck: { _id: randomCardFromDeck._id },
                                [`${playerToUpdate}.cards`]: { value: card.card }
                            }
                        })
                    }
                    else if (opponentCardPlayedSuite == randomCardFromDeck.suit) {

                        dominantSuite = opponentCardPlayedSuite
                        const opponentToUpdate = playerToUpdate == "player1" ? "player2" : "player1"
                        updateFurther = opponentToUpdate
                        suitsCond = true
                        bidWinner = String(opponentPlayerId)


                        await matchSchema.updateOne({ _id: activeMatchDetails._id }, {
                            $pull: {
                                deck: { _id: randomCardFromDeck._id },
                                [`${opponentToUpdate}.cards`]: { value: opponentCard }
                            }
                        })

                    }
                    else { noUpdateCond = true }

                    // replace the card 
                    let updateCond = {}
                    let randomTurn = await gamePlayhelper.getRandomNumberFromArray([opponentPlayerId, userId])
                    randomTurn = String(randomTurn)

                    if (noUpdateCond) {
                        updateCond = {
                            dominantSuite,
                            bidRound,
                            turns: [randomTurn],
                            turn: null,
                            round: 1,
                            $set: { 'player1.cardPlayed': {}, 'player2.cardPlayed': {} }
                        }
                    }
                    else {
                        const deckCondition = bidWinner == String(opponentPlayerId)
                        updateCond = {
                            dominantSuite,
                            $addToSet: {
                                [`${updateFurther}.cards`]: randomCardFromDeck,
                                deck: cards.find(e => deckCondition ? e.value == opponentCard : e.value == card.card)
                            },
                            bidRound,
                            turns: [randomTurn],
                            turn: null,
                            $set: { 'player1.cardPlayed': {}, 'player2.cardPlayed': {} },
                            round: 1
                        }
                    }
                    const updatedMatch = await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, updateCond, { new: true })


                    const dataObj = {
                        dominantSuite,
                        deck: updatedMatch.deck,
                        bidRound,
                        randomCardFromDeck,
                        bidWinner
                    }


                    io.to(currentUserSocketId).emit(socketConstants.updatedMatchDetails, { ...dataObj, cards: updatedMatch[playerToUpdate].cards })

                    io.to(opponentSocketId).emit(socketConstants.updatedMatchDetails, { ...dataObj, cards: updatedMatch[playerToUpdate === "player1" ? "player2" : "player1"].cards })

                    setTimeout(async () => {
                        const updatedMatch = await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, { turn: randomTurn }, { new: true })
                        const turnUser = String(updatedMatch.turn)
                        io.to(currentUserSocketId).emit(socketConstants.gameTurn, { turn: turnUser })

                        io.to(opponentSocketId).emit(socketConstants.gameTurn, { turn: turnUser })

                        let cards = String(updatedMatch[playerToUpdate].playerId) === turnUser ? updatedMatch[playerToUpdate].cards : updatedMatch[opponentKey].cards


                        cardForSkipTurn(turnUser, cards, io)


                    }, 2000)


                }
                else {
                    setTimeout(() => {

                        io.to(opponentSocketId).emit(socketConstants.playBidturn, {
                            playBidTurn: true,
                            turn: String(opponentPlayerId)
                        })

                        io.to(currentUserSocketId).emit(socketConstants.playBidturn, {
                            playBidTurn: true,
                            turn: String(opponentPlayerId)
                        })
                        this.skipBidTurn(opponentPlayerId, io)
                    }, 500)

                }
            }
            else {
                matchSchema.updateOne({ _id: activeMatchDetails._id }, {
                    [`${playerToUpdate}.cardPlayed`]: {},
                }, { new: true }).then()

                io.to(currentUserSocketId).emit(socketConstants.error, { message: currentUser.language == "en" ? messages.differentSuit : swMessages.differentSuit, status: 400 })
            }

        }
    }

}

module.exports.playCard = async (currentUser, userId, io, card) => {
    console.log(':::: play card :::: ', card, currentUser?.userName, userId)
    currentUser = await userSchema.findOne({ _id: currentUser._id, isBlock: false })
    if (currentUser) {
        card = cards.find((e) => e.value === card.card)


        global[currentUser.bidCardTimeOut] ? clearTimeout(global[currentUser.bidCardTimeOut]) : null

        const activeMatchDetails = await matchSchema.findOne({
            players: { $in: [userId] }, startTime: { $ne: null },
            endTime: null,
            bidRound: false,
            turn: userId
        })
        if (activeMatchDetails) {
            //get opponent details
            const opponentPlayerId = activeMatchDetails.players.find((e) => e.toString() != userId.toString())
            const opponentPlayer = await userSchema.findOne({ _id: opponentPlayerId, isBlock: false })
            if (opponentPlayer) {
                //socket id 's of both players
                const currentUserSocketId = currentUser.socketId
                const opponentSocketId = opponentPlayer.socketId
                //dynamic player key based on userId
                const PlayerKey = String(activeMatchDetails.player1.playerId) === String(currentUser._id) ? 'player1' : 'player2'

                const opponentKey = PlayerKey === "player1" ? 'player2' : 'player1'

                //check for both the users play turn and card

                //check for cardExist with the player

                const cardExistsforPlayer = activeMatchDetails[PlayerKey].cards.findIndex(e => e.value === card.value)

                if (cardExistsforPlayer > -1) {

                    io.to(currentUserSocketId).emit(socketConstants.playCard, {
                        turn: String(currentUser._id),
                        card: card.value
                    })

                    io.to(opponentSocketId).emit(socketConstants.playCard, {
                        turn: String(currentUser._id),
                        card: card.value
                    })


                    const updatedMatchDetails = await matchSchema.findOneAndUpdate({ _id: activeMatchDetails._id }, {
                        [`${PlayerKey}.cardPlayed`]: card,
                        $pull: { [`${PlayerKey}.cards`]: { value: card.value } }
                    }, { new: true })

                    if (updatedMatchDetails) {

                        if (activeMatchDetails.turns.length > 1) {
                            //assign turn for next round and icrement the round count

                            const player1Card = updatedMatchDetails.player1.cardPlayed
                            const player2Card = updatedMatchDetails.player2.cardPlayed
                            const player1CardPoints = updatedMatchDetails.player1.cardPlayed.points
                            const player2CardPoints = updatedMatchDetails.player2.cardPlayed.points
                            const totalPoints = player1CardPoints + player2CardPoints
                            const dominantSuite = updatedMatchDetails.dominantSuite
                            let winner = null
                            //suits same case
                            if (player1Card.suit === player2Card.suit) {
                                //check the points values for the cards
                                let player1Cond = player1Card.points > player2Card.points

                                let player2Cond = player2Card.points > player1Card.points

                                if (player1Cond || player2Cond) {
                                    winner = player1Cond ? updatedMatchDetails.player1.playerId : updatedMatchDetails.player2.playerId
                                }
                                else {
                                    //condition for card points are same then compare the actual cardValue
                                    let player1CondActual = player1Card.cardvalue > player2Card.cardvalue

                                    let player2CondActual = player2Card.cardvalue > player1Card.cardvalue

                                    if (player1CondActual || player2CondActual) {
                                        winner = player1CondActual ? updatedMatchDetails.player1.playerId : updatedMatchDetails.player2.playerId
                                    }
                                }
                            }
                            else {
                                //different suits condition
                                //if dominant suite card matches with any user card then the user is winner else user with first turn is winner
                                const player1SuitCond = player1Card.suit === dominantSuite

                                const player2SuitCond = player2Card.suit === dominantSuite

                                if (player1SuitCond || player2SuitCond) {
                                    winner = player1SuitCond ? updatedMatchDetails.player1.playerId : updatedMatchDetails.player2.playerId
                                }
                                else {
                                    winner = updatedMatchDetails.turns[0]
                                }
                            }

                            //update round and other details for match 
                            //assign a new card from deck to both the users

                            //get randomCard from deck and check whether deck has sufficent cards
                            let randomDeckCard = null
                            let updateCardsCond = Object.assign({})


                            if (updatedMatchDetails.deck.length >= 1) {
                                randomDeckCard = await gamePlayhelper.getRandomNumberFromArray(updatedMatchDetails.deck, 2)
                                updateCardsCond = {
                                    $pull: {
                                        deck: { value: { $in: [randomDeckCard[0].value, randomDeckCard[1].value] } },
                                    },
                                    $addToSet: {
                                        [`${PlayerKey}.cards`]: randomDeckCard[0],
                                        [`${opponentKey}.cards`]: randomDeckCard[1]
                                    }
                                }

                            }

                            const gameEndCond = updatedMatchDetails.player1.cards.length == 0 && updatedMatchDetails.player2.cards.length == 0

                            let updateObject = {}

                            const winnerKey = String(updatedMatchDetails[PlayerKey].playerId) === String(winner) ? PlayerKey : opponentKey

                            if (gameEndCond) {
                                updateObject['endTime'] = new Date()
                                updateObject['$inc'] = {
                                    [`${winnerKey}.points`]: totalPoints
                                }
                            }
                            else {
                                updateObject = {
                                    $inc: {
                                        round: 1,
                                        [`${winnerKey}.points`]: totalPoints
                                    },
                                    $set: {
                                        turns: [winner],
                                        turn: null,
                                        'player1.cardPlayed': {},
                                        'player2.cardPlayed': {}
                                    },
                                    // ...(updatedMatchDetails.turns.length == 2 && { turn: null }),
                                    ...updateCardsCond,
                                }
                            }
                            const [matchData] = await Promise.all([
                                matchSchema.findOneAndUpdate({ _id: updatedMatchDetails._id }, updateObject, { new: true }),
                                // ...(activeMatchDetails.tournament ? [tournamentSchema.updateOne({ _id: activeMatchDetails.tournament }, { $addToSet: { exitPlayers: activeMatchDetails.players.find(x => String(x) != String(winner)) } })] : [])
                            ])

                            let gameWinner = null
                            let gameDraw = false
                            const coins = parseInt(process.env.COINS)


                            if (matchData[PlayerKey].points > matchData[opponentKey].points) gameWinner = matchData[PlayerKey].playerId
                            else if (matchData[PlayerKey].points < matchData[opponentKey].points) gameWinner = matchData[opponentKey].playerId
                            else gameDraw = true

                            const points = String(matchData[PlayerKey].playerId) === String(winner) ? matchData[PlayerKey].points : matchData[opponentKey].points

                            //send winner and loser emit to both the users
                            setTimeout(async () => {
                                let matchCount = [];
                                if (matchData.tournament && gameEndCond) {
                                    matchCount = await matchSchema.find({ tournament: matchData.tournament, $or: [{ players: [currentUser._id, opponentPlayerId] }, { players: [opponentPlayerId, currentUser._id] }], endTime: { $ne: null }, winner: { $ne: null } })
                                    var { ownWins, opponentWins } = matchCount.reduce((acc, value) => {
                                        if (String(value.winner) == String(currentUser._id)) acc.ownWins += 1
                                        else if (String(value.winner) == String(opponentPlayerId)) acc.opponentWins += 1
                                        return acc
                                    }, { ownWins: 0, opponentWins: 0 })
                                }

                                io.to(currentUserSocketId).emit(socketConstants.roundWinner, {
                                    winner: String(winner) == String(userId),
                                    deck: matchData.deck,
                                    cards: matchData[PlayerKey].cards,
                                    gameComplete: gameEndCond,
                                    gameWinner: gameEndCond && !gameDraw ? gameWinner : null,
                                    gameDraw,
                                    points,
                                    coins,
                                    tournamentEnd: matchCount?.length >= 3 || ownWins >= 2 || opponentWins >= 2
                                })

                                io.to(opponentSocketId).emit(socketConstants.roundWinner, {
                                    winner: String(winner) == String(opponentPlayerId),
                                    deck: matchData.deck,
                                    cards: matchData[opponentKey].cards,
                                    gameComplete: gameEndCond,
                                    gameWinner: gameEndCond ? gameWinner : null,
                                    gameDraw,
                                    points,
                                    coins,
                                    tournamentEnd: matchCount?.length >= 3 || ownWins >= 2 || opponentWins >= 2
                                })
                                if (matchData.tournament && gameEndCond) {

                                    if (matchCount?.length < 3 && ownWins < 2 && opponentWins < 2) {
                                        const getRandomNumberFromArray = (arr) => {
                                            const randomIndex = Math.floor(Math.random() * arr.length);
                                            const randomValue = arr[randomIndex];
                                            return randomValue;
                                        }
                                        const { deck, player1, player2 } = distributeCards()
                                        const userCards = {
                                            playerId: userId,
                                            cards: player1
                                        }
                                        const opponentCards = {
                                            playerId: opponentPlayerId,
                                            cards: player2
                                        }
                                        const _id = new mongoose.Types.ObjectId
                                        setTimeout(async () => {

                                            const updatedTournamentDetails = await tournamentSchema.findOne({ _id: matchData.tournament, exitPlayers: { $in: [currentUser._id, opponentPlayerId] } }).populate('joinedPlayers')


                                            const users = await userSchema.find({ _id: { $in: [currentUser._id, opponentPlayerId] } }).lean()
                                            if (!users[0]?.isBlock && !users[1]?.isBlock && !updatedTournamentDetails) {
                                                const matchDetail = await new matchSchema({ _id, tournament: matchData.tournament, deck, startTime: new Date(), turn: getRandomNumberFromArray([opponentPlayerId, userId]), player1: userCards, player2: opponentCards, players: [currentUser._id, opponentPlayerId] }).save()

                                                delete matchDetail.player1.cards
                                                delete matchDetail.player2.cards
                                                delete matchDetail.players

                                                io.to(currentUserSocketId).emit(socketConstants.gameStart, {
                                                    ...matchDetail._doc, cards: player1, opponentCards: player2,
                                                    opponentInfo: {
                                                        _id: opponentPlayerId,
                                                        userName: opponentPlayer.userName,
                                                        profileImage: opponentPlayer.profileImage,
                                                        avatar: opponentPlayer.avatar,
                                                        badge: getBadge(opponentPlayer?.coins, false)

                                                    }
                                                })

                                                io.to(opponentPlayer.socketId).emit(socketConstants.gameStart, {
                                                    ...matchDetail._doc, cards: player2, opponentCards: player1,
                                                    opponentInfo: {
                                                        _id: currentUser._id,
                                                        userName: currentUser.userName,
                                                        profileImage: currentUser.profileImage,
                                                        avatar: currentUser.avatar,
                                                        badge: getBadge(currentUser?.coins, false)

                                                    }
                                                })
                                            } else {
                                                const winnerPlayer = !users[0].isBlock && !updatedTournamentDetails?.exitPlayers?.includes(users[0]?._id) ? users[0] : users[1]
                                                const looserPlayer = !users[0].isBlock && !updatedTournamentDetails?.exitPlayers?.includes(users[0]?._id) ? users[1] : users[0]
                                                await Promise.all([
                                                    matchSchema.updateOne({ _id: matchData?._id }, { endBySelfExit: true }),
                                                    tournamentSchema.updateOne({ _id: matchData?.tournament }, { $addToSet: { exitPlayers: looserPlayer._id } })
                                                ])
                                                io.to(winnerPlayer.socketId).emit(socketConstants.roundWinner, {
                                                    winner: String(winnerPlayer._id) == String(userId),
                                                    deck: matchData.deck,
                                                    cards: matchData[PlayerKey].cards,
                                                    gameComplete: gameEndCond,
                                                    gameWinner: gameEndCond && !gameDraw ? gameWinner : null,
                                                    gameDraw,
                                                    points,
                                                    coins,
                                                    tournamentEnd: true
                                                })
                                                const updatedDetail = await tournamentSchema.findOne({ _id: matchData.tournament }).lean()
                                                if (updatedDetail.exitPlayers.length == updatedDetail.joinedPlayers.length - 1 && (updatedDetail.destoryAfter2Mins || updatedDetail.joinedPlayers.length == updatedDetail.totalPlayers)) {
                                                    const winCoins = parseFloat((updatedDetail.registerCoins * updatedDetail.players.length) * 0.50)
                                                    const looseCoins = parseFloat((updatedDetail.registerCoins * updatedDetail.players.length) * 0.25)

                                                    const [userUpdate] = await Promise.all([
                                                        userSchema.findOneAndUpdate({ _id: winnerPlayer._id }, { $inc: { coins: winCoins }, inMatch: false, $set: { alreadyPlayed: [] } }), { new: true },
                                                        userSchema.findOneAndUpdate({ _id: looserPlayer._id }, { $inc: { coins: looseCoins }, inMatch: false, $set: { alreadyPlayed: [] } }), { new: true },
                                                        tournamentSchema.updateOne({ _id: updatedDetail._id }, { isEnd: true, winner: winnerPlayer._id }),
                                                        matchSchema.deleteMany({ tournament: updatedDetail.tournament, startTime: null })
                                                    ])
                                                    io.to(winnerPlayer.socketId).emit(socketConstants.tournamentResult, { message: winnerPlayer.language == 'en' ? messages.wonTourn : swMessages.wonTourn, isWinner: true, winCoins: userUpdate?.coins })
                                                } else this.randomMatch(winnerPlayer.socketId, winnerPlayer, io, { tournament: matchData.tournament })
                                            }
                                            setTimeout(async () => {
                                                const matchDetails = await matchSchema.findOne({ _id, endTime: null }, { turn: 1 }).lean()
                                                if (matchDetails) {
                                                    io.to(currentUserSocketId).emit(socketConstants.playBidturn, {
                                                        playBidTurn: true,
                                                        turn: String(matchDetails.turn)
                                                    })

                                                    io.to(opponentPlayer.socketId).emit(socketConstants.playBidturn, {
                                                        playBidTurn: true,
                                                        turn: String(matchDetails.turn)
                                                    })

                                                    this.skipBidTurn(matchDetails.turn, io)
                                                }
                                            }, 7000)

                                        }, 3000)


                                    } else {
                                        const [allMatches] = await Promise.all([
                                            matchSchema.find({ tournament: matchData.tournament, $or: [{ players: [currentUser._id, opponentPlayerId] }, { players: [opponentPlayerId, currentUser._id] }], endTime: { $ne: null }, winner: { $ne: null } }, { winner: 1 }),
                                        ])
                                        const { ownWins, opponentWins } = allMatches.reduce((acc, value) => {
                                            if (String(value.winner) == String(currentUser._id)) acc.ownWins += 1
                                            else if (String(value.winner) == String(opponentPlayerId)) acc.opponentWins += 1
                                            //else acc.opponentWins += 1
                                            return acc
                                        }, { ownWins: 0, opponentWins: 0 })

                                        const winnerPlayer = ownWins > opponentWins ? currentUser : opponentPlayer
                                        const looserPlayer = String(winnerPlayer._id) == String(currentUser._id) ? opponentPlayer : currentUser
                                        const [updatedDetails] = await Promise.all([
                                            tournamentSchema.findOneAndUpdate({ _id: matchData.tournament }, { $addToSet: { exitPlayers: looserPlayer?._id } }, { new: true }),
                                            userSchema.updateOne({ _id: looserPlayer._id }, { inMatch: false, $set: { alreadyPlayed: [] } })
                                        ])

                                        setTimeout(async () => {
                                            const updatedDetail = await tournamentSchema.findOne({ _id: matchData.tournament })

                                            if (updatedDetail.exitPlayers.length == updatedDetail.joinedPlayers.length - 1 && (updatedDetail.destoryAfter2Mins || updatedDetail.joinedPlayers.length == updatedDetail.totalPlayers)) {
                                                const winCoins = parseFloat((updatedDetail.registerCoins * updatedDetail.players.length) * 0.50)
                                                const looseCoins = parseFloat((updatedDetail.registerCoins * updatedDetail.players.length) * 0.25)
                                                const [userUpdate] = await Promise.all([
                                                    userSchema.findOneAndUpdate({ _id: winnerPlayer._id }, { $inc: { coins: winCoins }, inMatch: false, $set: { alreadyPlayed: [] } }), { new: true },
                                                    userSchema.findOneAndUpdate({ _id: looserPlayer._id }, { $inc: { coins: looseCoins }, inMatch: false, $set: { alreadyPlayed: [] } }), { new: true },
                                                    tournamentSchema.updateOne({ _id: updatedDetail._id }, { isEnd: true, winner: winnerPlayer._id }),
                                                    matchSchema.deleteMany({ tournament: updatedDetail.tournament, startTime: null })
                                                ])
                                                io.to(winnerPlayer.socketId).emit(socketConstants.tournamentResult, { message: winnerPlayer.language == 'en' ? messages.wonTourn : swMessages.wonTourn, isWinner: true, winCoins: userUpdate?.coins })
                                            } else {
                                                await userSchema.updateOne({ _id: winnerPlayer._id }, { $inc: { totalWins: 1 } })
                                                this.randomMatch(winnerPlayer.socketId, winnerPlayer, io, { tournament: matchData.tournament })
                                            }
                                            await userSchema.updateOne({ _id: looserPlayer?._id }, { inMatch: false })
                                            io.to(looserPlayer.socketId).emit(socketConstants.tournamentResult, { message: looserPlayer.language == 'en' ? messages.lostTourn : swMessages.lostTourn })

                                        }, 3000)
                                    }
                                } else if (gameEndCond) await userSchema.updateMany({ _id: { $in: [currentUser._id, opponentPlayerId] } }, { inMatch: false })

                            }, 1000);


                            if (!gameEndCond) {

                                setTimeout(() => {
                                    io.to(currentUserSocketId).emit(socketConstants.deckCard, {
                                        card: randomDeckCard ? randomDeckCard[0].value : null,
                                        opponentCard: randomDeckCard ? randomDeckCard[1].value : null
                                    })

                                    io.to(opponentSocketId).emit(socketConstants.deckCard, {
                                        card: randomDeckCard ? randomDeckCard[1].value : null,
                                        opponentCard: randomDeckCard ? randomDeckCard[0].value : null
                                    })
                                }, 2500)


                                setTimeout(async () => {
                                    const matchData = await matchSchema.findOneAndUpdate({ _id: updatedMatchDetails._id }, { turn: winner }, { new: true })
                                    const turnUser = String(matchData.turn)
                                    io.to(currentUserSocketId).emit(socketConstants.gameTurn, {
                                        turn: turnUser,
                                        time: new Date()
                                    })

                                    io.to(opponentSocketId).emit(socketConstants.gameTurn, {
                                        turn: turnUser,
                                        time: new Date()
                                    })

                                    const cards = String(matchData[PlayerKey].playerId) === turnUser ? matchData[PlayerKey].cards : matchData[opponentKey].cards

                                    cardForSkipTurn(turnUser, cards, io)

                                }, 3500)

                            }
                            else {
                                //update winner and  winner user coins
                                const update = gameDraw ? { gameDraw } : { winner: gameWinner }
                                matchSchema.updateOne({ _id: activeMatchDetails._id }, update).then()

                                userSchema.updateOne({ _id: gameWinner }, { $inc: { coins: (matchData.coins) * 2 } }).then()
                            }

                        }
                        else {
                            //assign turn to the opponent player,

                            await matchSchema.updateOne({ _id: activeMatchDetails._id }, { $addToSet: { turns: opponentPlayerId }, turn: opponentPlayerId })

                            io.to(currentUserSocketId).emit(socketConstants.gameTurn, { turn: opponentPlayerId })

                            io.to(opponentSocketId).emit(socketConstants.gameTurn, { turn: opponentPlayerId })

                            cardForSkipTurn(opponentPlayerId, updatedMatchDetails[opponentKey].cards, io)

                        }
                    }

                }
            }
        }
    }
}

module.exports.requestStatus = async (user, io, data) => {
    setTimeout(async () => {
        console.log("Friend Game ", data)

        const { roomId, status } = data
        const selfId = user._id
        user = await userSchema.findOne({ _id: selfId })
        const socketId = user.socketId
        const requestData = await gameRequestSchema.findOne({ _id: roomId, isAccepted: false, to: selfId })
        if (requestData) {
            const coins = requestData.coins
            const senderDetails = await userSchema.findOne({ _id: requestData.from })
            if (senderDetails) {

                const blockStatus = await blockSchema.findOne({ $or: [{ userId: selfId, blockedBy: senderDetails._id }, { userId: senderDetails._id, blockedBy: selfId }] })
                // checking the block status
                if (!blockStatus) {
                    //clear timeOut for sender
                    if (senderDetails.randomMatchTimeout) {
                        userSchema.updateOne({ _id: senderDetails._id }, { randomMatchTimeout: null }).then()
                        clearTimeout(global[senderDetails.randomMatchTimeout])
                    }

                    //make the match 
                    if (status) {
                        // setTimeout(async () => {
                        if (user.coins >= coins) {

                            const alreadyInMatch = await matchSchema.findOne({ players: { $in: [requestData.from] }, roomId: { $ne: roomId }, endTime: null })

                            if (!alreadyInMatch) {
                                // //clear the request data on success
                                await gameRequestSchema.deleteOne({ _id: requestData._id })

                                let [matchDetail] = await Promise.all([
                                    matchSchema.findOne({ roomId }),
                                ])
                                if (matchDetail) {
                                    await userSchema.updateMany({ _id: { $in: [requestData.from, requestData.to] } }, { inMatch: true, lastMatch: 'single' })

                                    const matchId = matchDetail._id
                                    const opponent = senderDetails
                                    const opponentId = senderDetails._id
                                    const selfDetails = await userSchema.findOneAndUpdate({ _id: selfId }, { onHomePage: false })

                                    //send emit for both the players for opponent found   

                                    io.to(opponent.socketId).emit(socketConstants.opponentFound, {
                                        status: true,
                                        userName: selfDetails.userName,
                                        profileImage: selfDetails.profileImage,
                                        avatar: selfDetails.avatar,
                                        badge: getBadge(selfDetails?.coins, false)
                                    })

                                    // navigation  to the screen
                                    io.to(selfDetails.socketId).emit(socketConstants.findMatchSuccess, {})

                                    io.to(selfDetails.socketId).emit(socketConstants.opponentFound, {
                                        status: true,
                                        userName: opponent.userName,
                                        profileImage: opponent.profileImage,
                                        avatar: opponent.avatar,
                                        badge: getBadge(opponent?.coins, false)
                                    })
                                    console.log('global')
                                    const getRandomNumberFromArray = async function (arr) {
                                        const randomIndex = Math.floor(Math.random() * arr.length);
                                        const randomValue = arr[randomIndex];
                                        return randomValue;
                                    }
                                    const { deck, player1, player2 } = distributeCards()
                                    const userCards = {
                                        playerId: selfId,
                                        cards: player1
                                    }
                                    const opponentCards = {
                                        playerId: opponentId,
                                        cards: player2
                                    }
                                    const matchDetails = await matchSchema.findOneAndUpdate({ _id: matchId }, {
                                        startTime: new Date(),
                                        deck,
                                        $addToSet: { players: selfId },
                                        player1: userCards,
                                        player2: opponentCards,
                                        turn: await getRandomNumberFromArray([selfId, opponentId])
                                    }, { new: true })
                                    //start the game and send the emit for start game
                                    global[matchId] = setTimeout(async () => {



                                        // if (matchDetails) {
                                        //update user coins on game start
                                        await userSchema.updateMany({ _id: { $in: matchDetails.players.map(e => e.toString()) } }, { $inc: { coins: (-matchDetails.coins) } })

                                        const users = await userSchema.find({ _id: { $in: [selfId, opponentId] } })
                                        users.forEach(e => {
                                            io.to(e.socketId).emit(socketConstants.coinsUpdate, { coins: e.coins, badge: getBadge(e.coins, false) })
                                        })
                                        // }

                                        // if (matchDetails && !matchDetails.endTime) {

                                        const dataObj = Object.assign({})
                                        dataObj['matchId'] = matchDetails._id
                                        dataObj['deck'] = matchDetails.deck
                                        // dataObj['turn'] = matchDetails.turn
                                        dataObj['bidRound'] = matchDetails.bidRound


                                        io.to(opponent.socketId).emit(socketConstants.gameStart, {
                                            ...dataObj, cards: matchDetails.player2.cards, opponentCards: matchDetails.player1.cards,
                                            opponentInfo: {
                                                _id: selfDetails._id,
                                                userName: selfDetails.userName,
                                                profileImage: selfDetails.profileImage,
                                                avatar: selfDetails.avatar,
                                                badge: getBadge(selfDetails?.coins, false)

                                            }
                                        })

                                        io.to(selfDetails.socketId).emit(socketConstants.gameStart, {
                                            ...dataObj, cards: matchDetails.player1.cards, opponentCards: matchDetails.player2.cards,
                                            opponentInfo: {
                                                _id: opponent._id,
                                                userName: opponent.userName,
                                                profileImage: opponent.profileImage,
                                                avatar: opponent.avatar,
                                                badge: getBadge(opponent?.coins, false)

                                            }
                                        })
                                        // }

                                        setTimeout(async () => {
                                            const matchDetails = await matchSchema.findOne({ _id: matchId, endTime: null })
                                            if (matchDetails) {
                                                //const socket = String(matchDetails.turn) == String(opponentId) ? opponent.socketId : selfDetails.socketId
                                                io.to(opponent.socketId).emit(socketConstants.playBidturn, {
                                                    playBidTurn: true,
                                                    turn: String(matchDetails.turn)
                                                })

                                                io.to(selfDetails.socketId).emit(socketConstants.playBidturn, {
                                                    playBidTurn: true,
                                                    turn: String(matchDetails.turn)
                                                })
                                                this.skipBidTurn(matchDetails.turn, io)
                                            }

                                        }, 3000)

                                    }, 4000)




                                } else {
                                    io.to(socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.roomNot : swMessages.roomNot, status: 400 })
                                    // io.to(senderDetails.socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.lastRoomDiscarded : swMessages.lastRoomDiscarded, status: 400 })
                                }
                            }
                            else io.to(socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.roomNot : swMessages.roomNot, status: 400 })

                        }
                        else io.to(socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.insufficentCoins : swMessages.insufficentCoins, status: 400 })
                        // }, Math.floor(Math.random() * (1500 - 500 + 1)) + 500)


                    } else {
                        let match = await matchSchema.findOne({ players: { $in: [requestData.from] }, roomId: roomId, endTime: null })
                        if (match) {
                            await Promise.all([
                                gameRequestSchema.deleteOne({ _id: requestData._id }),
                                matchSchema.deleteMany({ roomId })
                            ])
                            io.to(senderDetails.socketId).emit(socketConstants.error, { message: senderDetails.language == "en" ? messages.requestDeclined : swMessages.requestDeclined, status: 400 })
                        }
                        else io.to(socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.roomNot : swMessages.roomNot, status: 400 })
                        //let senderInGame = await matchSchema.findOne({ players: { $in: [senderDetails._id] }, endTime: null })

                        //let requestSent = await gameRequestSchema.findOne({ to: senderDetails._id, isAccepted: false })

                        //if (!senderInGame && !requestSent)
                    }
                }
                else io.to(socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.blockedUser : swMessages.blockedUser, status: 400 })
            }
            else io.to(socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.userNot : swMessages.userNot, status: 400 })
        }
        else io.to(socketId).emit(socketConstants.error, { message: user.language == "en" ? messages.roomNot : swMessages.roomNot, status: 400 })
    }, Math.floor(Math.random() * (1000 - 300 + 1)) + 300)

}

module.exports.disconnectUser = async (socketId, io) => {
    const userDetail = await userSchema.findOne({ socketId }).lean()
    if (userDetail) {
        console.log(':::: disconnect :::: ', userDetail.userName)
        await userSchema.updateOne({ _id: userDetail._id }, { socketId: null })
    }
}

module.exports.selfExit = async (currentUser, io, isDisconnect = false, netOff = false) => {
    //delete match user self exit on the invited screen before the game start
    console.log(':::::::: Exit ::::::::', { isDisconnect, netOff })
    const data = await Promise.all([
        tournamentSchema.findOneAndUpdate({ joinedPlayers: currentUser._id, exitPlayers: { $ne: currentUser._id }, isEnd: false }, { $addToSet: { exitPlayers: currentUser._id } }, { new: true }),
        userSchema.updateOne({ _id: currentUser?._id }, { onHomePage: true })
    ])
    console.log('data[1] ', data[0], currentUser?._id)
    setTimeout(async () => {
        const seldId = currentUser._id
        const userDetails = await userSchema.findOne({ _id: seldId })

        //clear intervals and timeouts
        userDetails.randomMatchInterval ? clearInterval(global[userDetails.randomMatchInterval]) : null

        userDetails.randomMatchTimeout ? clearTimeout(global[userDetails.randomMatchTimeout]) : null

        userDetails.bidCardTimeOut ? clearTimeout(global[userDetails.bidCardTimeOut]) : null

        const [matchDetails] = await Promise.all([
            matchSchema.findOne({ players: seldId, endTime: null }).sort({ createdAt: -1 }),
            userSchema.updateOne({ _id: userDetails._id }, { randomMatchInterval: null, onHomePage: true, randomMatchTimeout: null, bidCardTimeOut: null, ...(!isDisconnect && { inMatch: false, netOff: false }), $set: { alreadyPlayed: [] } }),
            gameRequestSchema.deleteOne({ from: seldId, isAccepted: false })
        ])
        clearTimeout(global[matchDetails?._id])

        if (matchDetails) {

            if (matchDetails && matchDetails.players.length == 2) {
                const opponentId = matchDetails.players.find((e) => String(e._id) != String(seldId))
                const opponent = await userSchema.findOne({ _id: opponentId })
                const exitPlayers = [seldId, ...(!opponent.socketId ? [opponentId] : [])]
                const promise = await Promise.all(
                    [
                        matchSchema.updateOne({ _id: matchDetails._id }, { endTime: new Date(), winner: opponentId, endBySelfExit: true }),
                        userSchema.updateOne({ _id: opponentId }, { $inc: { coins: (matchDetails.coins) * 2 }, ...(!matchDetails.tournament && { inMatch: false }), netOff: true }),
                        ...(matchDetails.tournament ? [tournamentSchema.findOneAndUpdate({ _id: matchDetails.tournament }, { $addToSet: { exitPlayers: exitPlayers } }, { new: true }).populate('joinedPlayers')] : [])
                    ]
                )
                if (matchDetails?.tournament) {
                    const opponentUser = await tournamentSchema.findOne({ _id: matchDetails.tournament, exitPlayers: { $ne: opponentId } })
                    if (!opponent.socketId && !opponentUser) {
                        const updatedTourn = promise[2]
                        const fixture = await gamePlayhelper.tournamentFixture(updatedTourn)
                        updatedTourn.joinedPlayers.map(x => {
                            const updatedFixture = []
                            fixture.map(i => { updatedFixture.push({ ...i, status: { ...i.status, message: x.language == 'en' ? messages[i.status.message] : swMessages[i.status.message] } }) })
                            if (!updatedTourn?.exitPlayers.includes(utils.parseMongoId(x._id))) io.to(x.socketId).emit(socketConstants.fixtureScreen, { fixture: updatedFixture, tournament: { ...updatedTourn._doc, winningAmount: (updatedTourn.registerCoins * updatedTourn?.totalPlayers) * 0.75, joinedPlayers: updatedTourn?.joinedPlayers?.length || 0 } })
                        })
                        const tournamentDetail = await tournamentSchema.findOne({ _id: matchDetails.tournament })
                        if (tournamentDetail?.exitPlayers?.length == tournamentDetail?.joinedPlayers?.length - 1 && (tournamentDetail.destoryAfter2Mins || tournamentDetail.joinedPlayers.length == tournamentDetail.totalPlayers)) {
                            const winner = gamePlayhelper.getUniqueElements(tournamentDetail.exitPlayers, tournamentDetail.joinedPlayers)
                            const user = await userSchema.findOne({ _id: winner[0] })
                            const winCoins = parseFloat((tournamentDetail?.registerCoins * tournamentDetail?.players.length) * 0.50)
                            const looserCoins = parseFloat((tournamentDetail?.registerCoins * tournamentDetail?.players.length) * 0.25)

                            console.log('user111', winCoins, looserCoins, fixture[1].userName, user.userName)
                            const [updatedUser, looser] = await Promise.all([
                                userSchema.findOneAndUpdate({ _id: user._id }, { inMatch: false, $inc: { coins: winCoins } }, { new: true }),
                                userSchema.findOneAndUpdate({ _id: fixture[1]._id }, { inMatch: false, $inc: { coins: looserCoins } }, { new: true }),
                                matchSchema.deleteMany({ tournament: matchDetails.tournament, startTime: null }),
                                tournamentSchema.updateOne({ _id: matchDetails?.tournament }, { winner: user._id, isEnd: true })
                            ])
                            io.to(user.socketId).emit(socketConstants.tournamentResult, { message: user.language == 'en' ? messages.wonTourn : swMessages.wonTourn, isWinner: true, winCoins: updatedUser?.coins })

                            io.to(looser.socketId).emit(socketConstants.coinsUpdate, { coins: looser.coins, badge: getBadge(looser.coins, false) })


                        }
                        return
                    }
                    io.to(opponent.socketId).emit(socketConstants.roundWinner, {
                        winner: true,
                        gameComplete: true,
                        gameWinner: opponent._id,
                        points: String(matchDetails.player1.playerId) == String(opponentId) ? matchDetails.player1.points : matchDetails.player2.points,
                        tournamentEnd: true
                    })
                    setTimeout(async () => {
                        const tournamentDetail = await tournamentSchema.findOne({ _id: matchDetails.tournament, isEnd: false })
                        if (tournamentDetail?.exitPlayers?.length == tournamentDetail?.joinedPlayers?.length - 1 && (tournamentDetail.destoryAfter2Mins || tournamentDetail.joinedPlayers.length == tournamentDetail.totalPlayers)) {

                            const fixtureData = await gamePlayhelper.tournamentFixture(tournamentDetail)
                            const winner = gamePlayhelper.getUniqueElements(tournamentDetail.exitPlayers, tournamentDetail.joinedPlayers)
                            const user = await userSchema.findOne({ _id: winner[0] })
                            const winCoins = parseFloat((tournamentDetail?.registerCoins * tournamentDetail?.players.length) * 0.50)
                            const looseCoins = parseFloat((tournamentDetail?.registerCoins * tournamentDetail?.players.length) * 0.25)

                            console.log('user222', winCoins, looseCoins, fixtureData[1].userName, user.userName, tournamentDetail.isEnd)


                            let [aaa, aaaa, looser] = await Promise.all([
                                matchSchema.deleteMany({ tournament: matchDetails.tournament, startTime: null }),
                                userSchema.updateOne({ _id: user._id }, { inMatch: false, $inc: { coins: winCoins } }),
                                userSchema.findOneAndUpdate({ _id: fixtureData[1]._id }, { inMatch: false, $inc: { coins: looseCoins } }, { new: true }),
                                tournamentSchema.updateOne({ _id: matchDetails?.tournament }, { winner: user._id, isEnd: true })
                            ])
                            io.to(user.socketId).emit(socketConstants.tournamentResult, { message: user.language == 'en' ? messages.wonTourn : swMessages.wonTourn, isWinner: true, winCoins: user?.coins })

                            io.to(looser.socketId).emit(socketConstants.coinsUpdate, { coins: looser.coins, badge: getBadge(looser.coins, false) })
                        } else {
                            await userSchema.updateOne({ _id: opponent._id }, { $inc: { totalWins: 1 } })
                            this.randomMatch(opponent.socketId, opponent, io, { tournament: matchDetails?.tournament })
                        }
                    }, 1000)
                } else {
                    if (opponent.onHomePage) {
                        await userSchema.updateOne({ _id: opponentId }, { onHomePage: false, inMatch: false })
                        io.to(opponent?.socketId).emit(socketConstants.lastGameStatus, { message: opponent.language == 'en' ? messages.lastWonRandom : swMessages.lastWonRandom })
                    } else io.to(opponent.socketId).emit('gameWin', { winnerId: String(opponentId) })
                }
                io.to(userDetails.socketId).emit("selfExitSuccess", {})
                if (netOff) io.to(userDetails.socketId).emit(socketConstants.lastGameStatus, { message: userDetails.language == 'en' ? messages.lastLostRandom : swMessages.lastLostRandom })
            }
            else {
                await Promise.all([
                    matchSchema.deleteOne({ players: { $in: [seldId] }, endTime: null }),
                    userSchema.updateOne({ _id: userDetails._id }, { ...(!isDisconnect && { inMatch: false }) }),
                    ...(matchDetails.tournament ? [tournamentSchema.updateOne({ _id: matchDetails.tournament }, { $addToSet: { exitPlayers: currentUser._id } })] : []),
                ])
                io.to(userDetails.socketId).emit("selfExitSuccess", {})
            }

        } else io.to(userDetails.socketId).emit("selfExitSuccess", {})

    }, Math.floor(Math.random() * (2500 - 1002 + 1)) + 1002)
}

module.exports.onMaximize = async (user, io) => {
    console.log('::: OnMaximize :::')
    const playerId = user._id
    user = await userSchema.findOne({ _id: playerId })

    let turnleftTime = null
    //find current active game
    const activeMatch = await matchSchema.findOne({ players: playerId, $expr: { $eq: [{ $size: '$players' }, 2] }, endTime: null }).populate('players', 'userName profileImage avatar coins').sort({ createdAt: -1 })

    if (activeMatch && activeMatch.timerStartTime) {
        turnleftTime = getRemainingTime(activeMatch.timerStartTime)
    }
    if (activeMatch) {
        const playerkey = String(activeMatch.player1.playerId) === String(playerId) ? "player1" : "player2"
        const opponetKey = playerkey === "player1" ? "player2" : "player1"
        const opponent = activeMatch.players.find(x => String(x._id) != String(playerId));
        const opponentWithBadge = { ...opponent.toObject(), badge: getBadge(opponent.coins, false) };
        const matchDetails = {
            deck: activeMatch.deck,
            cards: activeMatch[playerkey].cards,
            opponentCards: activeMatch[opponetKey].cards.filter(x => x.value != activeMatch[opponetKey].cardPlayed.value),
            bidRound: activeMatch.bidRound,
            bidStatus: activeMatch.bidRound && activeMatch?.bidPlayers?.includes(utils.parseMongoId(playerId)),
            turn: activeMatch?.turn,
            myPoints: activeMatch[playerkey].points,
            opponentPoints: activeMatch[opponetKey].points,
            myCardPlayed: activeMatch[playerkey].cardPlayed,
            opponentCardPlayed: activeMatch[opponetKey].cardPlayed,
            turnleftTime,
            dominantSuite: activeMatch.dominantSuite,
            opponent: opponentWithBadge

        }
        io.to(user.socketId).emit(socketConstants.selfMatchDetails, { matchDetails })
    }
    else {

        const lastMatch = await matchSchema.findOne({ players: playerId }).populate('players', 'userName profileImage avatar').sort({ createdAt: -1 })
        if (lastMatch && lastMatch.endTime) {
            if (lastMatch.winner.toString() == user._id.toString()) io.to(user.socketId).emit(socketConstants.lastGameStatus, { message: user.language == 'en' ? messages.lastWonRandom : swMessages.lastWonRandom })
            else io.to(user.socketId).emit(socketConstants.lastGameStatus, { message: user.language == 'en' ? messages.lastLostRandom : swMessages.lastLostRandom })
        }

        gameRequestSchema.deleteOne({ $or: [{ from: user._id }, { to: user._id }] }).then()

        clearInterval(global[user.randomMatchTimeout])
        if (activeMatch) {

            console.log(":::::::::::::::::::::::iFFFFFFFFFFFFFF::::::::::::::::")
            matchSchema.deleteOne({ _id: activeMatch?._id }).then()

        }
        else {
            console.log(":::::::::::::::::::::::elseeeeeee::::::::::::::::")

            console.log(":::::::::::::::matchhhhh:::::::::::::", await matchSchema.findOne({ players: playerId, startTime: null, endTime: null, tournament: null }).sort({ createdAt: -1 }))
            matchSchema.deleteOne({ players: playerId, startTime: null, endTime: null, tournament: null }).sort({ createdAt: -1 }).then()
        }
        console.log('::: selfMatchDetails 22222:::')

        io.to(user.socketId).emit(socketConstants.selfMatchDetails, { matchDetails: null, isGameEnd: true })

        // check active tournament
        let tournament = await tournamentSchema.findOne({ joinedPlayers: { $in: [playerId] }, exitPlayers: { $nin: [playerId] }, isStart: true, isEnd: false })
        // console.log('tournament', tournament)
        if (tournament) {
            const fixture = await gamePlayhelper.tournamentFixture(tournament)

            let tournamentPlayers = await userSchema.find({ _id: { $in: tournament.joinedPlayers } })

            // console.log('fixture', fixture)
            const updatedFixture = []
            tournamentPlayers.map(x => {
                fixture.map(i => {
                    let findCond = updatedFixture.find((e) => String(e?._id) == String(i?._id))
                    if (!findCond) updatedFixture.push({ ...i, status: { ...i.status, message: x.language == 'en' ? messages[i.status.message] : swMessages[i.status.message] } })
                })
                console.log('x.language1111', x.language, x.userName, updatedFixture)
                if (!tournament?.exitPlayers.includes(utils.parseMongoId(x._id))) io.to(x.socketId).emit(socketConstants.fixtureScreen, { fixture: updatedFixture, tournament: { ...tournament._doc, winningAmount: (tournament.registerCoins * tournament?.totalPlayers) * 0.75, joinedPlayers: tournament?.joinedPlayers?.length || 0 } })
            })

            // console.log('updatedFixture', updatedFixture)

            io.to(user.socketId).emit(socketConstants.fixtureScreen, { fixture: updatedFixture, tournament: { ...tournament._doc, joinedPlayers: tournament?.joinedPlayers?.length || 0 } })
        }


    }
}

function getRemainingTime(startTime, duration = parseInt(process.env.MATCH_TURN_TIME)) {
    if (startTime) {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, duration - elapsedTime);
        return (remainingTime / 1000);
    }
    else return null
}

module.exports.chat = async (io, userId, emoji) => {
    const activeMatchDetails = await matchSchema.findOne({
        players: { $in: [userId] }, startTime: { $ne: null },
        endTime: null,
    })
    if (activeMatchDetails) {
        const item = await shopSchema.findOne({ _id: emoji.emoji })
        const opponent = activeMatchDetails.players.find((e) => String(e) != String(userId))
        const opponentUser = await userSchema.findOne({ _id: opponent })

        io.to(opponentUser.socketId).emit(socketConstants.chatMessage, { imageUrl: item.imageUrl })
    }

}

module.exports.changeLanguage = async (io, userId, language) => {
    console.log(':::: change langugage :::: ', language)
    const languageUpdated = await userSchema.findOneAndUpdate({ _id: userId }, { language: language.language }, { new: true })
    io.to(languageUpdated?.socketId).emit(socketConstants.setLanguageSuccess, { language: language.language })

}

module.exports.gameWinSuccess = async (_id) => {
    console.log(':::: gameWinSuccess :::: ',)
    await userSchema.updateOne({ _id }, { netOff: false })
}