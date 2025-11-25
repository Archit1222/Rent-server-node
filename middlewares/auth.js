const userSchema = require('../models/user.model')
const adminSchema = require('../models/admin.model')

const { messages, swMessages, socketConstants } = require('../helpers/constant')
const utils = require('../helpers/utils')

module.exports.auth = async (req, res, next) => {
    try {
        const userAuth = req.headers['x-access-token']
        const adminAuth = req.headers['authorization']
        let message = req.headers.language == "sw" ? swMessages : messages
        if (userAuth) {
            if (userAuth.startsWith('Bearer ')) {
                const token = userAuth.replace('Bearer', '').trim()
                const authStatus = await utils.verifyJwt(token)
                console.log('authStatus',authStatus)
                if (authStatus) {
                    const userDetails = await userSchema.findOne({ _id: authStatus.id, deviceToken: authStatus?.deviceToken }).lean()
                     console.log('userDetails',userDetails)
                    if (userDetails) {
                       
                        if (userDetails.isBlock) return res.status(401).json(utils.errorResponse(message.blocked))
                        if (userDetails.password == authStatus.password) {
                            if (userDetails.deviceToken) {
                                if (userDetails.deviceToken == authStatus.deviceToken) {
                                    req.user = userDetails
                                    next()
                                }
                                else return res.status(401).json(utils.errorResponse(message.deviceErr))
                            }
                            else return res.status(401).json(utils.errorResponse(message.session))
                        }
                        else return res.status(401).json(utils.errorResponse(message.session))
                    }
                    else return res.status(401).json(utils.errorResponse(message.session))
                }
                else return res.status(401).json(utils.errorResponse(message.session))
            }
            else return res.status(401).json(utils.errorResponse(message.session))
        }
        else if (adminAuth) {
            if (adminAuth.startsWith('Bearer ')) {
                const token = adminAuth.replace('Bearer', '').trim()
                const authStatus = await utils.verifyJwt(token)
                if (authStatus) {
                    const userDetails = await adminSchema.findOne({ _id: authStatus._id }).lean()
                    // console.log('authStatus', userDetails)
                    if (userDetails) {
                        if (userDetails.password == authStatus.password) {
                            if (userDetails.deviceToken) {
                                if (userDetails.deviceToken == authStatus.deviceToken) {
                                    req.user = userDetails
                                    next()
                                } else return res.status(401).json(utils.errorResponse(message.deviceErr))
                            }
                            else return res.status(401).json(utils.errorResponse(message.session))
                        }
                        else return res.status(401).json(utils.errorResponse(message.session))
                    }
                    else return res.status(401).json(utils.errorResponse(message.session))
                }
                else return res.status(401).json(utils.errorResponse(message.session))
            }
            else return res.status(401).json(utils.errorResponse(message.session))
        }
        else return res.status(401).json(utils.errorResponse(message.session))

    } catch (error) {
        console.log(error)
        next(error)
    }
}


// module.exports.socketUserAuthentication = async (socket, next) => {
//     try {
//         const authToken = socket.handshake.headers['x-access-token']
//         console.log("authtoken:::::::::: ", authToken);
//         if (authToken && authToken.startsWith('Bearer ')) {
//             const verify = await utils.verifyJwt(authToken.replace("Bearer ", ""))

//             const socketId = socket.id
//             const { id, deviceToken } = verify
//             if (verify) {
//                 const user = await userSchema.findOne({ _id: id }).lean()
//                 if (user) {
//                     await userSchema.updateOne({ _id: id }, { socketId })
//                     socket.user = { ...user, socketId }
//                     socket.deviceToken = deviceToken
//                     next()
//                 }
//                 else {
//                     return next(new Error(messages.session))
//                 }
//             }
//             else {
//                 global.io.to(socketId).emit(socketConstants.error, { message: swMessages.deviceErr, status: 401 })

//                 console.log("user::::::::::::::::22", socketId)
//                 return next(new Error(messages.session))
//             }
//         }
//         else return next(new Error(messages.session))

//     } catch (error) { return next(error) }
// }


module.exports.socketUserAuthentication = async (socket, next) => {
    try {
        // Accept token from BOTH header (websocket) and query (polling)
        let authToken = socket.handshake.headers['x-access-token']
                     || socket.handshake.query.token;

        console.log("authToken:::::::::: ", authToken);

        if (authToken && authToken.startsWith('Bearer ')) {
            const verify = await utils.verifyJwt(authToken.replace("Bearer ", ""));

            const socketId = socket.id;
            const { id, deviceToken } = verify;

            if (verify) {
                const user = await userSchema.findOne({ _id: id }).lean();

                if (user) {
                    await userSchema.updateOne({ _id: id }, { socketId });
                    socket.user = { ...user, socketId };
                    socket.deviceToken = deviceToken;
                    return next();
                } else {
                    return next(new Error(messages.session));
                }
            } else {
                global.io.to(socketId).emit(socketConstants.error, { message: swMessages.deviceErr, status: 401 });
                return next(new Error(messages.session));
            }
        } else {
            return next(new Error(messages.session));
        }

    } catch (error) {
        return next(error);
    }
};