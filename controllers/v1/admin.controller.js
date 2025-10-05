
const adminSchema = require('../../models/admin.model')
const userSchema = require('../../models/user.model')
const matchSchema = require('../../models/match.model')
const notificationSchema = require('../../models/notification.model')
const tournamentSchema = require('../../models/tournament.model')
const shopSchema = require('../../models/shop.model')
const utils = require('../../helpers/utils')
const { messages, responseStatus, socketConstants, swMessages, getBadge, typeOfVersion } = require('../../helpers/constant')
const { sendEmail } = require('../../helpers/email')
const moment = require('moment')
const ejs = require('ejs')
const shopModel = require('../../models/shop.model')
const QuerySchema=require('../../models/query.model')
const { selfExit } = require('./gamePlay.controller')
const gamePlayhelper = require('./gamePlayhelper')
const shopRentModel = require('../../models/shopRent.model')
const { default: mongoose } = require('mongoose')


//admin auth

module.exports.login = async (req, res, next) => {
    try {
        const { email, password, } = req.body;
        const deviceToken = String(Date.now())
        const user = await adminSchema.findOne({ email }).lean()
        const storeUser= await userSchema.findOne({email}).lean()

        console.log("storeUser",storeUser)

        if (user && await utils.comparePassword(user.password, password)) {
            await adminSchema.updateOne({ _id: user._id }, { deviceToken })
            return res.status(responseStatus.success).json(utils.successResponse(messages.loggedIn, { ...user ,role:"ADMIN", token: utils.SIGNJWT({ _id: user._id, password: user.password, deviceToken }) }))
        }
        else if(storeUser && await utils.comparePassword(storeUser.password, password)) {
            await userSchema.updateOne({ _id: user._id }, { deviceToken })
            return res.status(responseStatus.success).json(utils.successResponse(messages.loggedIn, { ...storeUser ,role:"User", token: utils.SIGNJWT({ _id: storeUser._id, password: storeUser.password, deviceToken }) }))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.correctEmailPass))
    }
    catch (err) { return next(err) }
}

module.exports.forgotPassword = async (req, res, next) => {
    try {
        const email = req.body['email']
        const user = await adminSchema.findOne({ email }).select('_id').lean()
        if (user) {
            const token = utils.SIGNJWT({ _id: user._id }, { expiresIn: "10m" })
            const url = `${process.env.FORGOT_URL}/resetPassword?userId=${token}`

            adminSchema.updateOne({ _id: user._id }, { forgotToken: token }).then().catch()

            ejs.renderFile('views/forgot.admin.ejs', { year: new Date().getFullYear(), URL: url }, (err, data) => {
                if (err) console.log(err)
                else sendEmail(email, "Reset Password", data)
            });

            return res.status(responseStatus.success).json(utils.successResponse(messages.forgotPasswordLinkSent, { token }))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.emailNotRegAdmin))
    }
    catch (err) { return next(err) }
}


module.exports.forgotLinkValid = async (req, res, next) => {
    try {
        const { token } = req.body
        const decode = utils.verifyJwt(token)
        if (decode) {
            const user = await adminSchema.findOne({ forgotToken: token }).select('_id').lean()
            if (user) return res.status(responseStatus.success).json(utils.successResponse(messages.linkFetched))
            else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.linkExpired))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.linkExpired))
    }
    catch (err) { return next(err) }
}

module.exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body
        const decode = utils.verifyJwt(token)
        if (decode) {
            const user = await adminSchema.findOne({ forgotToken: token }).select('_id').lean()
            if (user) {
                await adminSchema.updateOne({ _id: user._id }, { forgotToken: null, password: await utils.hashPassword(password) })
                return res.status(responseStatus.success).json(utils.successResponse(messages.passwordChanged))
            }
            else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.linkExpired))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.linkExpired))
    }
    catch (err) { return next(err) }
}

module.exports.changePassword = async (req, res, next) => {
    try {
        const user = req.user
        const { oldPassword, newPassword } = req.body
        if (await utils.comparePassword(user.password, oldPassword)) {
            await adminSchema.updateOne({ _id: user._id }, { password: await utils.hashPassword(newPassword) })
            return res.status(responseStatus.success).json(utils.successResponse(messages.passwordChanged))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse( messages.incorrectOldPassword ))
    }
    catch (err) { return next(err) }
}

module.exports.dashboard = async (req, res, next) => {
    try {
        // const { startOfDay, endOfDay } = req.body

        let today = moment().utc()

        let startOfDay = new Date(today.clone().startOf('day'))
        let endOfDay = new Date(today.clone().endOf('day'))
        let lastWeekStart = new Date(today.clone().startOf('week'))
        let lastWeekEnd = new Date(today.clone().endOf('week'))
        let lastMonthStart = new Date(today.clone().startOf('month'))
        let lastMonthEnd = new Date(today.clone().endOf('month'))
        let last3MonthStart = new Date(today.clone().subtract(3, 'Month'))
        let lastYearStart = new Date(today.clone().startOf('year'))

        // let userList = await userSchema.aggregate([
        //     {
        //         $group: {
        //             _id: null,
        //             users: {
        //                 $push: { createdAt: '$$ROOT.createdAt' }
        //             }
        //         }
        //     },
        //     {
        //         $project: {
        //             _id: 0,
        //             total: { $size: '$users' },
        //             today: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$users",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", startOfDay] },
        //                                 { $lte: ["$$user.createdAt", endOfDay] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             week: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$users",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", lastWeekStart] },
        //                                 { $lte: ["$$user.createdAt", lastWeekEnd] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             month: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$users",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", lastMonthStart] },
        //                                 { $lte: ["$$user.createdAt", lastMonthEnd] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             quater: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$users",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", last3MonthStart] },
        //                                 // { $lte: ["$$user.createdAt", l] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             year: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$users",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", lastYearStart] },
        //                                 // { $lte: ["$$user.createdAt", l] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             }

        //         }
        //     }

        // ])

        // let matchList = await matchSchema.aggregate([
        //     {
        //         $match: {
        //             endTime: { $ne: null }
        //         }
        //     },
        //     {
        //         $group: {
        //             _id: null,
        //             matches: { $push: { createdAt: '$$ROOT.createdAt' } }
        //         }
        //     },
        //     {
        //         $project: {
        //             _id: 0,
        //             total: { $size: '$matches' },
        //             today: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$matches",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", startOfDay] },
        //                                 { $lte: ["$$user.createdAt", endOfDay] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             week: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$matches",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", lastWeekStart] },
        //                                 { $lte: ["$$user.createdAt", lastWeekEnd] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             month: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$matches",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", lastMonthStart] },
        //                                 { $lte: ["$$user.createdAt", lastMonthEnd] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             quater: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$matches",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", last3MonthStart] },
        //                                 // { $lte: ["$$user.createdAt", l] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             },
        //             year: {
        //                 $size: {
        //                     $filter: {
        //                         input: "$matches",
        //                         as: "user",
        //                         cond: {
        //                             $and: [
        //                                 { $gte: ["$$user.createdAt", lastYearStart] },
        //                                 // { $lte: ["$$user.createdAt", l] }
        //                             ]

        //                         },
        //                     }

        //                 }
        //             }

        //         }
        //     }
        // ])

       let totalUsers=await userSchema.find({ emailVerified: true}).countDocuments()

       let totalShops=await shopModel.find({ }).countDocuments()

        let totalQueries=await QuerySchema.find({ }).countDocuments()
        
        // Calculate date range for graph data
        let graphStartDate, graphEndDate;
        
        if (req.body.startDate && req.body.endDate) {
            // Use provided start and end dates
            graphStartDate = new Date(req.body.startDate);
            graphEndDate = new Date(req.body.endDate);
        } else {
            // Default to last 7 days
            graphStartDate = new Date(moment().utc().subtract(90, 'days').startOf('day'));
            graphEndDate = new Date(moment().utc().endOf('day'));
        }

        let graphData = await userSchema.aggregate([
            {
                $match: {
                    emailVerified: true,
                    createdAt: {
                        $gte: graphStartDate,
                        $lte: graphEndDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ])


        return res.status(responseStatus.success).json(utils.successResponse(messages.dashboard, {
            totalUsers: totalUsers,
            totalShops: totalShops,
            queries: totalQueries,
            graphData: graphData
        }))
    }
    catch (err) {
        console.log('err', err)
        return next(err)
    }
}

module.exports.userList = async (req, res) => {
    let aggregationArray = []
    let pagination = [{ $skip: 0 }, { $limit: 10 }]

    let { search, offset, limit, sort, order } = req.body

    if ((offset || offset == 0) && limit) {
        pagination = [{ $skip: offset }, { $limit: limit }]
    }


    aggregationArray.push(
        {
            $match: {
                emailVerified: true,
                ...(req.body.search && {
                    $or: [
                        { userName: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { email: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { fullName: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                    ]
                })
            }
        },
        {
            $addFields: {
                usernameBefore: '$userName',
                name: { $toLower: '$userName' },
                fullnameBefore: '$fullName',
                fullname: { $toLower: '$fullName' }
            }
        }
    )


    if (sort && ((order == 1) || (order == -1))) {
        aggregationArray.push(
            {
                $sort: {
                    [sort]: order
                }
            }
        )
    }
    else {
        aggregationArray.push({
            $sort: {
                createdAt: -1
            }
        })
    }

    aggregationArray.push(
        {
            $project: {
                email: 1,
                userName: '$usernameBefore',
                fullName: '$fullnameBefore',
                profileImage: 1,
                isBlock: 1,
                avatar: 1,
                coins: 1,
                createdAt : 1,
            }
        }
    )

    aggregationArray.push(
        {
            "$facet": {
                data: pagination,
                totalCount: [
                    { "$count": "count" }
                ]
            }
        },
        {
            $unwind: {
                path: "$totalCount",
                preserveNullAndEmptyArrays: true
            }
        }
    )

    let users = await userSchema.aggregate(aggregationArray)
    totalCount = users && users[0] && users[0].totalCount ? users[0].totalCount.count : 0
    return res.status(200).json(utils.successResponse(messages.userList, {
        userList: users[0].data,
        paginationData: utils.paginationData(totalCount, limit ? limit : 10, offset ? offset : 0)
    }))
}

module.exports.block = async (req, res) => {
    const userId = req.params.id
    if (!utils.validMongoId(userId)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.inValidId))
    let userDetails = await userSchema.findOne({ _id: userId })
    if (userDetails) {
        if (!userDetails.isBlock) {
            selfExit(userDetails, global.io)
            global.io.to(userDetails.socketId).emit(socketConstants.error, {
                message: userDetails.language == "en" ? messages.blocked : swMessages.blocked,
                status: 401
            })
        }
        await userSchema.updateOne({ _id: userId }, { isBlock: !userDetails.isBlock, deviceToken: null, socketId: null, onHomePage: true })
        return res.status(responseStatus.success).json(utils.successResponse(userDetails.isBlock ? messages.userUnBlock : messages.userBlock, { isBlock: !userDetails.isBlock }))
    }
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.userNot))
}

module.exports.userView = async (req, res) => {
    const userId = req.body.id
    if (!utils.validMongoId(userId)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.inValidId))
    let userDetails = await userSchema.findOne({ _id: userId }).select('userName fullName email profileImage avatar coins isBlock')
    if (userDetails) {
        return res.status(responseStatus.success).json(utils.successResponse(messages.details, userDetails))
    }
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.userNot))
}


module.exports.userEdit = async (req, res) => {

    const { fullName, userName, userId } = req.body
    if (!utils.validMongoId(userId)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.inValidId))
    let profileImage = req.file ? req.file.path : null
    let userDetails = await userSchema.findOne({ _id: userId })
    if (userDetails) {
        const updatedUser = await userSchema.findOneAndUpdate({ _id: userId }, {
            profileImage: profileImage ? profileImage : userDetails.profileImage,
            userName: userName ? userName : userDetails.userName,
            fullName: fullName ? fullName : userDetails.fullName
        }, { new: true })
        return res.status(responseStatus.success).json(utils.successResponse(messages.userEdit, updatedUser))
    }
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.userNot))
}


module.exports.userdelete = async (req, res) => {

    const { userId } = req.body
    if (!utils.validMongoId(userId)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.inValidId))
    let userDetails = await userSchema.findOne({ _id: userId })
    if (userDetails) {
        await userSchema.deleteOne({_id:userId})

        await shopRentModel.deleteMany({userId:userId})
        return res.status(responseStatus.success).json(utils.successResponse(messages.userdelete))
    }
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.userNot))
}


module.exports.addCoins = async (req, res) => {
    const { userId, coins } = req.body
    const updatedCoins = await userSchema.findOneAndUpdate({ _id: userId }, { $inc: { coins } }, { new: true })
    global.io.to(updatedCoins?.socketId).emit(socketConstants.coinsUpdate, { coins: updatedCoins?.coins, badge: getBadge(updatedCoins?.coins, false) })
    return res.status(responseStatus.success).json(utils.successResponse(messages.coinsUpdated, coins))
}


module.exports.sendNotification = async (req, res, next) => {
    try {
        const { title, description } = req.body
        if (!title) return res.status(responseStatus.badRequest).json(utils.errorResponse("Please enter title."))
        if (!description) return res.status(responseStatus.badRequest).json(utils.errorResponse("Please enter description."))
        const users = await userSchema.find({ deviceToken: { $ne: null } })
        const notificationUsers = users.map(e => e.deviceToken)

        utils.sendPushNotification(notificationUsers, title, description)

        await notificationSchema({ title, description }).save()

        return res.status(responseStatus.success).json(utils.errorResponse(messages.notificationSent))


    } catch (error) {
        next(error)
    }
}


module.exports.logout = async (req, res, next) => {
    try {
        await adminSchema.updateOne({ _id: req.user._id }, { deviceToken: null, deviceType: null })
        return res.status(responseStatus.success).json(utils.successResponse(messages.loggedOut))
    }
    catch (err) { return next(err) }
}


module.exports.addTournament = async (req, res, next) => {
    try {
        const { name, dateTime, totalPlayers, registerCoins } = req.body
        await tournamentSchema({ name, dateTime: moment.utc(dateTime, 'YYYY-MM-DDTHH:mm'), totalPlayers, registerCoins }).save()
        global.io.emit('screenRefresh', {})
        return res.status(responseStatus.success).json(utils.successResponse(messages.addTournament))
    }
    catch (err) { return next(err) }
}

module.exports.tournamentList = async (req, res, next) => {
    try {
        let pagination = [{ $skip: 0 }, { $limit: 10 }]

        let { search, offset, limit, sort, order } = req.body

        if ((offset || offset == 0) && limit) {
            pagination = [{ $skip: offset }, { $limit: limit }]
        }

        const tournaments = await tournamentSchema.aggregate([
              {
                $addFields:{
                    exists:{
                        $cond:[{$in:[req.user._id, "$players"]},true,false]
                    }
                }

            },
            {
                $match:{
                    $expr:{
                        $cond:['$exists',{
                            $or:[{destoryAfter2Mins:true},{destoryAfter2Mins:false}]
                        },{$or:[{destoryAfter2Mins:false}]}]
                    }
                }
            },
            {
                $match: {
                    isEnd: false,
                    isBlock: false,
                    // destoryAfter2Mins:{
                    //     $cond:['$exists',true,false]
                    //     //$in:[]
                    // },
                    //winner:{$ne:null},
                    $or: [
                        {
                            $expr: {
                                $or: [
                                    {
                                        $gt: ['$dateTime', new Date(moment().utc(moment()).format('YYYY-MM-DDTHH:mm'))]
                                    },
                                    {
                                        $in: [req.user._id, "$players"]
                                    },
                                    {
                                        $in: [req.user._id, "$exitPlayers"]
                                    }
                                ]
                            }
                        },
                    ],
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    name: 1,
                    winningAmount: { $multiply: [{ $multiply: ['$totalPlayers', '$registerCoins'] }, 0.75] },
                    registerCoins: 1,
                    totalPlayers: 1,
                    dateTime: 1,
                    isBlock: 1,
                    registerCoins: 1,
                    isSelfRegistered: { $in: [req.user._id, { $ifNull: ['$players', []] }] },
                    winnerAmount: { $multiply: [{ $multiply: ['$totalPlayers', '$registerCoins'] }, 0.50] },
                    runnerAmount: { $multiply: [{ $multiply: ['$totalPlayers', '$registerCoins'] }, 0.25] },
                    isStart: 1,
                    players: { $size: { $ifNull: ['$players', []] } },
                    canJoin: { $cond: [{ $in: [req.user._id, "$exitPlayers"] }, false, { $lte: ['$dateTime', new Date(moment().utc(moment()).format('YYYY-MM-DDTHH:mm'))] }] },
                    canSpectate: { $in: [req.user._id, "$exitPlayers"] }
                }
            },
            {
                "$facet": {
                    data: pagination,
                    totalCount: [
                        { "$count": "count" }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$totalCount",
                    preserveNullAndEmptyArrays: true
                }
            }
        ])
        totalCount = tournaments && tournaments[0] && tournaments[0].totalCount ? tournaments[0].totalCount.count : 0
        console.log(":::::::::tournaments[0].data::::::::", tournaments[0].data)
        return res.status(responseStatus.success).json(utils.successResponse(messages.tournamentList, {
            tournamentList: tournaments[0].data,
            paginationData: utils.paginationData(totalCount, limit ? limit : 10, offset ? offset : 0)
        }))
    }
    catch (err) { return next(err) }
}




module.exports.tournamentFixture = async (req, res, next) => {
    try {

        let { tournamentId } = req.body

        let tournamentDetail= await tournamentSchema.findOne({_id:tournamentId,isBlock:false}).lean()

        if(tournamentDetail){
            let fixture = await gamePlayhelper.tournamentFixture(tournamentDetail)

            fixture.map(i => { 
                // updatedFixture.push({ ...i, status: { ...i.status, message: x.language == 'en' ? messages[i.status.message] : swMessages[i.status.message] } }) 

                i.status= {...i.status,message: req.user.language == 'en' ? messages[i.status.message] : swMessages[i.status.message]}
            })



            console.log('fixture',fixture)

            return res.status(responseStatus.success).json(utils.successResponse('tournament fixture fetched successfully.',{
                tournamentId:tournamentDetail._id,
                name:tournamentDetail.name,
                isEnd:tournamentDetail.isEnd,
                totalPlayers:tournamentDetail.players.length,
                joinedPlayers:tournamentDetail.joinedPlayers.length,
                winningAmount:((tournamentDetail.totalPlayers)*(tournamentDetail.registerCoins))*0.75,
                fixture,
            }))

        }
        else res.status(responseStatus.badRequest).json(utils.errorResponse('tournament not found'))

    }
    catch (err) { return next(err) }
}

module.exports.tournamentListForAdmin = async (req, res, next) => {
    try {
        let pagination = [{ $skip: 0 }, { $limit: 10 }]

        let { search, offset, limit, sort, order } = req.body

        if ((offset || offset == 0) && limit) {
            pagination = [{ $skip: offset }, { $limit: limit }]
        }

        const tournaments = await tournamentSchema.aggregate([
            ...(search ? [{
                $match: {
                    name: { $regex: new RegExp(('.*' + search + '.*'), "i") }
                }
            }] : []),
            {
                $addFields: {
                    nameWithLowerCase: '$name',
                    name: { $toLower: '$name' }
                }
            },
            {
                $sort: {
                    [sort || 'createdAt']: order || -1
                }
            },
            {
                $project: {
                    name: '$nameWithLowerCase',
                    winningAmount: 1,
                    registerCoins: 1,
                    totalPlayers: 1,
                    dateTime: 1,
                    isBlock: 1,
                    registerCoins: 1,
                    isStart: 1,
                    isSelfRegistered: { $in: [req.user._id, { $ifNull: ['$players', []] }] },
                    players: { $size: { $ifNull: ['$players', []] } }
                }
            },
            {
                "$facet": {
                    data: pagination,
                    totalCount: [
                        { "$count": "count" }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$totalCount",
                    preserveNullAndEmptyArrays: true
                }
            }
        ])
        totalCount = tournaments && tournaments[0] && tournaments[0].totalCount ? tournaments[0].totalCount.count : 0
        return res.status(responseStatus.success).json(utils.successResponse(messages.tournamentList, {
            tournamentList: tournaments[0].data,
            paginationData: utils.paginationData(totalCount, limit || 10, offset || 0)
        }))
    }
    catch (err) { return next(err) }
}

module.exports.blockTournament = async (req, res, next) => {
    const tournamentId = req.params.id
    if (!utils.validMongoId(tournamentId)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.inValidId))

    let tournamentDetails = await tournamentSchema.findOne({ _id: tournamentId }).populate('players')


    if (tournamentDetails) {
        if (tournamentDetails.isStart) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.tournamentStart))

        await userSchema.updateMany({ _id: { $in: tournamentDetails.players.map(x => x._id) } }, { $inc: { coins: tournamentDetails.registerCoins } })
        await tournamentSchema.updateOne({ _id: tournamentId }, { isBlock: !tournamentDetails.isBlock, players: [], joinedPlayers: [] })
        tournamentDetails.players.map(user => global.io.to(user.socketId).emit(socketConstants.coinsUpdate, { coins: user.coins + tournamentDetails.registerCoins, badge: getBadge(user.coins + tournamentDetails.registerCoins, false) }))
        global.io.emit('screenRefresh', {})
        return res.status(responseStatus.success).json(utils.successResponse(tournamentDetails.isBlock ? messages.tourUnBlock : messages.tourBlock, { isBlock: !tournamentDetails.isBlock }))
    }
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.tournamentNot))
}


module.exports.editTournament = async (req, res, next) => {
    const { name, dateTime, totalPlayers, registerCoins, tournamentId } = req.body
    if (!utils.validMongoId(tournamentId)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.inValidId))
    let tournamentDetails = await tournamentSchema.findOne({ _id: tournamentId })
    if (tournamentDetails) {
        await tournamentSchema.updateOne({ _id: tournamentId }, {
            name: name ? name : tournamentDetails.name,
            dateTime: dateTime ? dateTime : tournamentDetails.dateTime,
            totalPlayers: totalPlayers ? totalPlayers : tournamentDetails.totalPlayers,
            registerCoins: registerCoins ? registerCoins : tournamentDetails.registerCoins
        })
        return res.status(responseStatus.success).json(utils.successResponse(messages.tournamentUpdated))
    }
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.tournamentNot))
}

module.exports.tournamentDetail = async (req, res) => {
    const { tournament, offset, limit, sort, order } = req.body
    const detail = await tournamentSchema.aggregate([
        {
            $match: {
                _id: utils.parseMongoId(tournament)
            }
        },
        {
            $lookup: {
                from: 'users',
                let: { playersId: '$players' },
                localField: 'players',
                foreignField: '_id',
                as: 'players',
                pipeline: [
                    {
                        $addFields: {
                            index: { $indexOfArray: ["$$playersId", "$_id"] }
                        }
                    },
                    {
                        $sort: { [sort || 'index']: order || 1 }
                    },
                    {
                        $project: {
                            userName: 1,
                            fullName: 1,
                            email: 1
                        }
                    },
                    {
                        $facet: {
                            data: [{ $skip: offset || 0 }, { $limit: limit || 10 }],
                            totalCount: [{ $count: 'count' }]
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'winner',
                foreignField: '_id',
                as: 'winner'
            }
        },
        {
            $project: {
                name: 1,
                dateTime: 1,
                totalPlayers: 1,
                winningAmount: 1,
                registerCoins: 1,
                winner: { $first: '$winner.userName' },
                players: 1
            }
        }
    ])
    if (detail[0]) {
        return res.status(responseStatus.success).json(utils.successResponse(messages.tournamentDetails, {
            detail: { ...detail[0], players: detail[0]?.players[0]?.data || [] },
            paginationData: utils.paginationData(detail[0]?.players[0].totalCount[0]?.count || 0, limit || 10, offset || 0)
        }))
    }
    else return res.status(responseStatus.badRequest).json(utils.successResponse(messages.tournamentNot))
}



module.exports.shopList = async (req, res, next) => {
    let { offset, limit, search, sort, order, type,userId } = req.body

    if(req.headers['x-access-token']){
        sort="createdAt",
        order=1
    }

    let pagination = [{ $skip: 0 }, { $limit: 10 }]


    if ((offset || offset == 0) && limit) {
        pagination = [{ $skip: offset }, { $limit: limit }]
    }

    const shops = await shopSchema.aggregate([
        {
            $match: {
                ...(search && {
                    $or: [
                        { name: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { status: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                    ]
                }),
                  ...(userId && {
                     rentUser:mongoose.Types.ObjectId(rentUser)
                })
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"rentUser",
                foreignField:"_id",
                pipeline:[
                    {
                        $project:{
                            userName:1,
                            email:1
                        }
                    }
                ],
                as:"rentUser"
            }
        },
        {
            $unwind:{
                path:"$rentUser",
                preserveNullAndEmptyArrays:true
            }
        },
        {
            $addFields:{
               rentUser:{$cond:['$rentUser','$rentUser',null]} 
            }
        },
        ...(sort && order ? [{
            $sort: { [sort]: order }
        }] : [{ $sort: { createdAt: -1 } }]),
        {
            "$facet": {
                data: pagination,
                totalCount: [
                    { "$count": "count" }
                ]
            }
        },
        {
            $unwind: {
                path: "$totalCount",
                preserveNullAndEmptyArrays: true
            }
        }
    ])


    totalCount = shops && shops[0] && shops[0].totalCount ? shops[0].totalCount.count : 0
    return res.status(200).json(utils.successResponse(messages.userList, {
        shopList: shops[0].data,
        paginationData: utils.paginationData(totalCount, limit ? limit : 10, offset ? offset : 0)
    }))


}

module.exports.gameList = async (req, res) => {
    const { offset, limit, search, sort, order } = req.body

    const list = await matchSchema.aggregate([
        {
            $match: {
                endTime: { $ne: null }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'players',
                foreignField: '_id',
                as: 'players',
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'winner',
                foreignField: '_id',
                as: 'winner',
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$winner",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'tournaments',
                localField: 'tournament',
                foreignField: '_id',
                as: 'tournamentDetail'
            }
        },
        {
            $unwind: {
                path: "$tournamentDetail",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                playerOne: { $cond: [{ $arrayElemAt: ["$players.userName", 0] }, { $arrayElemAt: ["$players.userName", 0] }, null] },
                playerTwo: { $cond: [{ $arrayElemAt: ["$players.userName", 1] }, { $arrayElemAt: ["$players.userName", 1] }, null] },
                winner: '$winner.userName',
                coins: { $cond: [{ $ne: ['$tournament', null] }, '$tournamentDetail.registerCoins', '$coins'] },
                type: { $cond: [{ $ne: ['$tournament', null] }, 'Tournament', 'Head To Head'] },
                startTime: 1,
                endTime: 1,
                createdAt: 1
            }
        },
        ...(search ? [
            {
                $match: {
                    $or: [
                        { winner: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { playerTwo: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { playerOne: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { type: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                    ]
                }
            }
        ] : []),
        {
            $sort: {
                [sort || 'createdAt']: order || -1
            }
        },
        {
            "$facet": {
                data: [{ $skip: offset || 0 }, { $limit: limit || 10 }],
                totalCount: [
                    { "$count": "count" }
                ]
            }
        },
        {
            $unwind: {
                path: "$totalCount",
                preserveNullAndEmptyArrays: true
            }
        }
    ])


    return res.status(200).json(utils.successResponse(messages.gameList, {
        list: list[0]?.data || [],
        paginationData: utils.paginationData(list[0]?.totalCount?.count || 0, limit || 10, offset || 0)
    }))

}


module.exports.addShop = async (req, res, next) => {
    const { name,status } = req.body

    let shop=await shopSchema({ name,status }).save()

    return res.status(responseStatus.success).json(utils.successResponse("Shop added successfully.",shop))

}


module.exports.shopView = async (req, res, next) => {
    const id = req.body.id
     if (!utils.validMongoId(id)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.shopNotFound))
    const shopExists = await shopSchema.findOne({ _id: id }).populate('rentUser')
    if (shopExists) return res.status(responseStatus.success).json(utils.successResponse(messages.shopDetails, shopExists))
    else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.shopNotFound))

}

module.exports.shopVisitors = async (req, res, next) => {
    const id = req.body.shopId


    if (!utils.validMongoId(id)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.shopNotFound))

    const { offset, limit, search, sort, order, type } = req.body

    let pagination = [{ $skip: 0 }, { $limit: 10 }]


    if ((offset || offset == 0) && limit) {
        pagination = [{ $skip: offset }, { $limit: limit }]
    }

     const list = await shopRentModel.aggregate([
    { $match: { shopId: utils.parseMongoId(id) } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        as: "users",
        foreignField: "_id",
      },
    },

    {
        $project: {
            "users.userName": 1,
            "users.email": 1,
            "users.createdAt": 1,
            "users.isBlock": 1,
            "users.profileImage": 1,  
            "users._id": 1,  
        }
    },

    ...(search
      ? [
          {
            $match: {
              $or: [
                { "users.userName": { $regex: new RegExp(".*" + search + ".*", "i") } },
                { "users.email": { $regex: new RegExp(".*" + search + ".*", "i") } },
              ],
            },
          },
        ]
      : []),
    {
      $unwind: "$users",
    },

    {
      $replaceRoot: {
        newRoot: "$users",
      },
    },

    ...(sort && order
      ? [
          {
            $sort: { [sort]: order },
          },
        ]
      : [{ $sort: { createdAt: -1 } }]),
    {
      $facet: {
        data: pagination,
        totalCount: [{ $count: "count" }],
      },
    },
    {
      $unwind: {
        path: "$totalCount",
        preserveNullAndEmptyArrays: true,
      },
    },
  ]);


   return res.status(200).json(utils.successResponse(messages.shopVisitorList, {
        list: list[0]?.data || [],
        paginationData: utils.paginationData(list[0]?.totalCount?.count || 0, limit || 10, offset || 0)
    }))

}



module.exports.shopEdit = async (req, res, next) => {

    const { name,status, id,user } = req.body
    if (!utils.validMongoId(id)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.shopNotFound))

    const shopExists = await shopSchema.findOne({ _id: id }).select('_id imageUrl').lean()
    if (!shopExists) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.shopNotFound))

   let shopData =  await shopSchema.findOneAndUpdate({ _id: shopExists._id }, { name, status,rentUser:user?user:null },{new:true})
    return res.status(responseStatus.success).json(utils.successResponse("Shop updated successfully.",shopData))
}

module.exports.shopDelete = async (req, res, next) => {

    const id = req.body.id;
    if (!utils.validMongoId(id)) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.shopNotFound))

    const shopExists = await shopSchema.findOne({ _id: id }).select('_id').lean();
    if (!shopExists) return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.shopNotFound));

    await shopSchema.deleteOne({ _id: id });
    return res.status(responseStatus.success).json(utils.successResponse(messages.shopItemDeleted))
}

module.exports.notificationList = async (req, res, next) => {
    try {
        const { offset, limit, search, sort, order } = req.body
        const pagination = [{ $skip: offset ? offset : 0 }, { $limit: limit ? limit : 10 }]
        const notificationList = await notificationSchema.aggregate([
            ...(search ? [{
                $match: {
                    $or: [
                        { title: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { description: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                    ]
                }

            }] : []),
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    type: 1,
                    createdAt: 1
                }
            },
            {
                "$facet": {
                    data: pagination,
                    totalCount: [
                        { "$count": "count" }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$totalCount",
                    preserveNullAndEmptyArrays: true
                }
            }


        ])
        let totalCount = notificationList && notificationList[0] && notificationList[0].totalCount ? notificationList[0].totalCount.count : 0
        return res.status(responseStatus.success).json(utils.successResponse(messages.notificationList, {
            data: notificationList[0].data,
            paginationData: utils.paginationData(totalCount, limit ? limit : 10, offset ? offset : 0)
        }))

    } catch (error) {
        next(error)
    }
}


module.exports.QueryList = async (req, res, next) => {
    try {
        const { offset, limit, search, sort, order } = req.body
        const pagination = [{ $skip: offset ? offset : 0 }, { $limit: limit ? limit : 10 }]
        const notificationList = await QuerySchema.aggregate([
            ...(search ? [{
                $match: {
                    $or: [
                        { email: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { name: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { concern: { $regex: new RegExp(('.*' + search + '.*'), "i") } },
                        { shopType: { $regex: new RegExp(('.*' + search + '.*'), "i") } }
                    ]
                }

            }] : []),
            
            {
                $lookup:{
                    from:"users",
                    localField:"userId",
                    foreignField:"_id",
                    as:"user"

                }
            },
            {$unwind:{path:"$user",preserveNullAndEmptyArrays:true}},
                        ...(sort && order
                ? [
                    {
                    $sort: { [sort]: order },
                    },
                ]
                : [{ $sort: { createdAt: -1 } }]),
            {
                "$facet": {
                    data: pagination,
                    totalCount: [
                        { "$count": "count" }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$totalCount",
                    preserveNullAndEmptyArrays: true
                }
            }


        ])
        let totalCount = notificationList && notificationList[0] && notificationList[0].totalCount ? notificationList[0].totalCount.count : 0
        return res.status(responseStatus.success).json(utils.successResponse(messages.notificationList, {
            data: notificationList[0].data,
            paginationData: utils.paginationData(totalCount, limit ? limit : 10, offset ? offset : 0)
        }))

    } catch (error) {
        next(error)
    }
}


module.exports.editNotification = async (req, res, next) => {
    try {
        const { id, title, description } = req.body
        const notificationExists = await notificationSchema.findOne({ _id: id })
        if (notificationExists) {
            await notificationSchema.updateOne({ _id: id }, {
                title: title ? title : notificationExists.title,
                description: description ? description : notificationExists.description
            })
            return res.status(responseStatus.success).json(utils.successResponse(messages.notificationUpdated))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.notificationNot))
    }
    catch (error) {
        next(error)
    }
}


module.exports.deleteNotification = async (req, res, next) => {
    try {
        const id = req.body.id
        const notificationExists = await notificationSchema.findOne({ _id: id })
        if (notificationExists) {
            await notificationSchema.deleteOne({ _id: id })
            return res.status(responseStatus.success).json(utils.successResponse(messages.notficationDeleted))
        }
        else return res.status(responseStatus.badRequest).json(utils.errorResponse(messages.notificationNot))
    } catch (error) {
        next(error)
    }
}


module.exports.getVersion = async (req, res, next) => {
    try {
        const getVersion = await adminSchema.findOne({}, { iosVersion: 1, androidVersion: 1 }).lean()

        return res.status(responseStatus.success).json(utils.successResponse(messages.versionfetch, getVersion))
    }
    catch (error) {
        console.log("error", error)
        next(error)
    }
}

module.exports.updateVersion = async (req, res, next) => {

    const { androidVersion, iosVersion } = req.body;

    adminSchema.updateOne({}, { androidVersion, iosVersion }).then((x) => {
        return res.status(responseStatus.success).json(utils.successResponse(messages.versionUpdateSuccess))
    })
        .catch(e => console.log("======== error whilw updating the version ========"))


}

module.exports.addmanualUser = async (req, res, next) => {

    const { email, password, userName,gender } = req.body;

    let userExists= await userSchema.findOne({email:email})

    if(userExists){
        return res.status(responseStatus.badRequest).json(utils.errorResponse("Email already exist's"))
    }

    const userData = await userSchema({
      gender, userName,email, password: await utils.hashPassword(password),emailVerified:true }).save()

     return res.status(responseStatus.success).json(utils.successResponse("User added sucessfully",userData))
}

