
//messages for the app
const translate = require('translate-google');
const { sendMessage } = require('../controllers/v1/gamePlay.controller');


module.exports.messages = {
    loggedIn: "Logged in successfully.",
    validType: "Please enter valid type.",
    profileCompleted: "Profile completed successfully.",
    verifyEmailSubject: "Email Verification.",
    correctOtp: "Please enter correct OTP.",
    otp:"Please enter otp.",
    userNot: "User not found.",
    verifyEmail: "Please verify email ID to login.",
    validUserId: "Please enter valid userId.",
    signUp: "User registered successfully.",
    verifyOtp: "Otp verified successfully.",
    correctEmail: "Please enter correct email ID or password.",
    emailNotReg: "This email ID is not registered with us.",
    verifyEmailForgot: "Please verify your email ID first.",
    forgot: "We have sent you OTP on your email.",
    forgotPasswordLinkSent: "Forgot password link has been sent to your email address successfully.",
    resetPassword: "Password changed successfully.",
    logout: "Logout successfully.",
    deleteAccount: 'Account deleted successfully.',
    profile: "Profile fetched successfully.",
    profileUpdated: "Profile updated successfully",
    session: "Your session has expired.",
    linkExpired: "This link has expired.",
    deviceErr: "Your account has been logged into another device.",
    userName: "UserName already exists.",
    enterUserName: "Please enter userName",
    validDate: "Please enter valid date.",
    ageLimit: "Age must be greater than 3 years",
    validRefferal: "Please enter a valid referral code.",
    refferalComp: "Refferal completed successfully.",
    insufficentCoins: "You don't have sufficient coins to play the game.",
    differentSuit: "Please play a different suit card.",
    userBlocked: "User has been blocked successfully.",
    userUnblocked: "User has been unblocked successfully.",
    noBlockedUser: "Blocked user not found.",
    blockedList: "Blocked user list has been fetched succesfully.",
    leaderBoard: "LeaderBoard fetched successfully.",
    alreadyFriend: "Already friends.",
    friendDone: "Now friends",
    notFriends: "User is not a friend.",
    gameRequest: "Game request sent successfully.",
    reqList: "Game request list fetched successfully.",
    ReqAlready: "A game request is already received from this user. Please check received game requests!",
    alreadymatch: "This user already in match.",
    roomNot: "This room has been discarded.",
    lastRoomDiscarded: 'Your last room has been discarded.',
    requestDeclined: "Request declined by the user.",
    blocked: "Your account has been blocked by the admin.",
    shopList: "Shop list fetched successfully.",
    shopVisitorList: "Shop visitor list fetched successfully.",
    itemNot: "Item doesn't exist.",
    ItemPurchase: "Item purchased successfully.",
    insufficentPurchase: "You don't have sufficient coins to purchase this item.",
    invalidItemId: "Please enter valid item id.",
    coinsPurchased: "Coins purchased successfully.",
    enterReciept: "Please enter receipt.",
    transactionId: "Transaction id already exists.",
    enterEmail: "Please enter email.",
    enterPassword: "Please enter password.",
    userName: "Please enter Username.",
    userNameAlready: "UserName already exists.",
    emailExists: "Email ID already exists.",
    phoneExists: "Phone already exists.",
    validUserId: "Please enter valid userIds.",
    notificationSent: "Notification sent successfully.",
    enterMessage: "Please enter message.",
    notificationList: "Notification list fetched successfully.",
    linkFetched: "Link fetched successfully.",
    passwordChanged: "Password changed successfully.",
    loggedOut: "Logged out successfully.",
    incorrectOldPassword: "Please enter correct old password.",
    samePassword: "Old and new password should not be same.",
    userList: "User list fetched successfully.",
    userBlock: "User blocked successfully.",
    blockedUser: 'You have been blocked by this user.',
    userUnBlock: "User unblocked successfully.",
    details: "User details fetched successfully.",
    userEdit: 'User details updated successfully.',
    inValidId: "Please enter valid id.",
    invalidotp:"Invalid otp.",
    dashboard: "Dashboard details fetched successfully.",
    addTournament: "Tournament added successfully.",
    tournamentList: "Tournament list fetched successfully.",
    tournamentNot: "Tournament not found.",
    versionUpdateSuccess: "Version updated.",
    versionfetch: "Version fetched.",
    tourBlock: "Tournament blocked successfully.",
    tourUnBlock: "Tournament unblocked successfully.",
    emailNotRegAdmin: "This email address is not registered with us.",
    correctEmailPass: "Please enter correct email address or password.",
    opponentNotFound: "Opponent not found.",
    enterLanguage: "Please enter language.",
    uploadImage: "Please upload image.",
    shopAdded: (type) => `${type} added successfully.`,
    shopNotFound: "Shop not found.",
    shopDetails: "Shop details fetched successfully.",
    coinsUpdated: "Coins updated successfully.",
    notificationNot: "Notification not found.",
    notificationUpdated: "Notification updated successfully.",
    notficationDeleted: "Notification deleted successfully.",
    insufficentCoinsTour: "You have not sufficent coins to play the tournament.",
    maximumPlayers: "Maximum players reached for the tournament",
    tournamentReg: "Tournament registered successfully.",
    alreadyRegistred: "Already registered for the tournament",
    unregistered: "Tournament unregistered successfully.",
    eliminated: 'Eliminated',
    inGame: 'In-game',
    waiting: 'Waiting for opponents...',
    tournamentDetails: "Tournament details fetched successfully",
    tournamentUpdated: "Tournament updated successfully",
    tournamentStart: "Tournament already started.",
    shopItemUpdated: (type) => `${type} has been updated successfully.`,
    shopItemDeleted: "Item has been deleted successfully.",
    gameList: 'Game list fetched successfully',
    alreadyInMatch: 'This user already in match.',
    lastWonTourn: 'You won your last tournament.',
    lastWonRandom: 'You won your last match.',
    lastLostTourn: 'You lost your last tournament.',
    lastLostRandom: 'You lost your last match.',
    wonTourn: 'You won the tournament',
    lostTourn: 'You lost the tournament',
    tournamentEnded: "Tournament has been ended.",
    deviceTokenError: "Something went wrong. Please restart the application.",
    userdelete:"User deleted successfully."

}

module.exports.swMessages = {
    loggedIn: 'Imeingia kwa mafanikio.',
    validType: 'Tafadhali ingiza aina halali.',
    profileCompleted: 'Wasifu umekamilika',
    verifyEmailSubject: 'Uthibitishaji wa barua pepe.',
    correctOtp: 'Tafadhali ingiza OTP sahihi.',
    userNot: 'Mtumiaji hajapatikana.',
    verifyEmail: 'Tafadhali thibitisha kitambulisho cha barua pepe kuingia.',
    validUserId: 'Tafadhali ingiza mtumiaji halali.',
    signUp: 'Mtumiaji amesajiliwa kwa mafanikio.',
    verifyOtp: 'OTP imethibitishwa kwa mafanikio.',
    correctEmail: 'Tafadhali ingiza kitambulisho sahihi cha barua pepe au nywila.',
    emailNotReg: 'Kitambulisho hiki cha barua pepe hakijasajiliwa na sisi.',
    verifyEmailForgot: 'Tafadhali thibitisha kitambulisho chako cha barua pepe kwanza.',
    forgot: 'Rudisha nywila OTP iliyotumwa kwa kitambulisho chako cha barua pepe kwa mafanikio.',
    forgotPasswordLinkSent: 'Umesahau Kiunga cha Nenosiri kimetumwa kwa anwani yako ya barua pepe kwa mafanikio.',
    resetPassword: 'Nenosiri lilibadilika kwa mafanikio.',
    logout: 'Kuondoka kwa mafanikio',
    profile: 'Wasifu umepatikana umefaulu',
    profileUpdated: 'Wasifu ulisasishwa kwa mafanikio',
    deleteAccount: 'Akaunti imefutwa.',
    session: 'Kipindi chako kimeisha.',
    alreadyInMatch: 'Mtumiaji huyu tayari analingana.',
    linkExpired: 'Kiunga hiki kimeisha.',
    deviceErr: 'Akaunti yako imeingia kwenye kifaa kingine.',
    userName: 'Jina la mtumiaji tayari lipo.',
    enterUserName: 'Tafadhali ingiza jina la mtumiaji',
    validDate: 'Tafadhali ingiza tarehe halali.',
    ageLimit: 'Umri lazima uwe mkubwa kuliko miaka 3',
    validRefferal: 'Tafadhali weka msimbo halali wa rufaa.',
    refferalComp: "Uwasilishaji umekamilika.",
    insufficentCoins: 'Hauna sarafu za kutosha kucheza mchezo.',
    differentSuit: 'Tafadhali cheza kadi tofauti ya suti.',
    userBlocked: 'Mtumiaji amezuiliwa kwa mafanikio.',
    userUnblocked: 'Mtumiaji amefunguliwa kwa mafanikio.',
    noBlockedUser: 'Mtumiaji aliyezuiwa hajapatikana.',
    blockedList: 'Orodha ya watumiaji iliyofungwa imechukuliwa kwa mafanikio.',
    leaderBoard: 'Bodi ya kiongozi ilichukua mafanikio.',
    alreadyFriend: 'Tayari marafiki.',
    blockedUser: 'Umezuiwa na mtumiaji huyu.',
    friendDone: 'Sasa marafiki',
    notFriends: 'Mtumiaji sio rafiki.',
    gameRequest: 'Ombi la mchezo limetumwa kwa mafanikio.',
    reqList: 'Orodha ya ombi la mchezo imepatikana.',
    ReqAlready: 'Ombi la mchezo tayari limepokelewa kutoka kwa mtumiaji huyu. Tafadhali angalia maombi yaliyopokelewa ya mchezo!',
    alreadymatch: "Mtumiaji huyu tayari analingana.",
    roomNot: 'Chumba hiki kimetupwa.',
    requestDeclined: 'Ombi limekataliwa na mtumiaji.',
    blocked: 'Umezuiliwa na mtumiaji huyu.',
    shopList: 'Orodha ya duka ilifanikiwa.',
    itemNot: 'Kipengee hakipo.',
    ItemPurchase: 'Bidhaa imefanikiwa kununuliwa.',
    insufficentPurchase: 'Huna sarafu za kutosha kununua bidhaa hii.',
    invalidItemId: 'Tafadhali ingiza kitambulisho halali cha bidhaa.',
    coinsPurchased: 'Sarafu zilizonunuliwa kwa mafanikio.',
    enterReciept: 'Tafadhali ingiza risiti.',
    transactionId: 'Kitambulisho cha manunuzi tayari kipo.',
    enterEmail: 'Tafadhali ingiza barua pepe.',
    enterPassword: 'Tafadhali weka nenosiri.',
    userNameAlready: 'Jina la mtumiaji tayari lipo.',
    emailExists: 'Kitambulisho cha barua pepe tayari kipo.',
    phoneExists: 'Simu tayari ipo.',
    notificationSent: 'Arifa iliyotumwa kwa mafanikio.',
    enterMessage: 'Tafadhali ingiza ujumbe.',
    notificationList: 'Orodha ya arifu ilichukua kwa mafanikio.',
    linkFetched: 'Kiunga kilichukuliwa kwa mafanikio.',
    passwordChanged: 'Nenosiri lilibadilika kwa mafanikio.',
    loggedOut: 'Imewekwa nje kwa mafanikio.',
    incorrectOldPassword: 'Tafadhali weka nenosiri sahihi la zamani.',
    samePassword: 'Nenosiri la zamani na mpya halipaswi kuwa sawa.',
    userList: 'Orodha ya watumiaji ilichukua mafanikio.',
    userBlock: 'Mtumiaji alizuiliwa kwa mafanikio.',
    userUnBlock: 'Mtumiaji ameondolewa kizuizi.',
    details: 'Maelezo ya mtumiaji yameletwa kwa mafanikio.',
    inValidId: 'Tafadhali ingiza kitambulisho halali.',
    dashboard: 'Maelezo ya dashibodi yalipatikana kwa mafanikio.',
    addTournament: 'Mashindano yaliongezwa kwa mafanikio.',
    tournamentList: 'Orodha ya mashindano ilichukua kwa mafanikio.',
    tournamentNot: 'Mashindano hayajapatikana.',
    tourBlock: 'Mashindano yalizuiliwa kwa mafanikio.',
    tourUnBlock: 'Mashindano hayakufunguliwa kwa mafanikio.',
    emailNotRegAdmin: 'Anwani hii ya barua pepe haijasajiliwa na sisi.',
    correctEmailPass: 'Tafadhali ingiza anwani sahihi ya barua pepe au nywila.',
    opponentNotFound: 'Mpinzani hakupatikana.',
    enterLanguage: 'Tafadhali ingiza lugha.',
    uploadImage: 'Tafadhali pakia picha.',
    shopAdded: 'Duka limeongezwa kwa mafanikio.',
    shopNotFound: 'Duka haipatikani.',
    shopDetails: 'Maelezo ya duka yalipatikana kwa mafanikio.',
    coinsUpdated: 'Sarafu zilizosasishwa kwa mafanikio.',
    notificationNot: 'Arifa haipatikani.',
    notificationUpdated: 'Arifa imesasishwa kwa mafanikio.',
    lastRoomDiscarded: 'Chumba chako cha mwisho kimetupwa.',
    notficationDeleted: 'Arifa ilifutwa kwa mafanikio.',
    insufficentCoinsTour: 'Hauna sarafu za kutosha kucheza mashindano.',
    maximumPlayers: 'Wachezaji wa kiwango cha juu walifikiwa kwa mashindano',
    tournamentReg: 'Mashindano yamesajiliwa kwa mafanikio.',
    alreadyRegistred: 'Tayari imesajiliwa kwa mashindano hayo',
    unregistered: 'Mashindano hayajasajiliwa kwa mafanikio.',
    eliminated: 'Umeondolewa',
    inGame: 'Katika mchezo',
    waiting: 'Inasubiri wapinzani...',
    lastWonTourn: 'Ulishinda mashindano yako ya mwisho.',
    lastWonRandom: 'Ulishinda mechi yako ya mwisho.',
    lastLostTourn: 'Ulipoteza mashindano yako ya mwisho.',
    lastLostRandom: 'Ulipoteza mechi yako ya mwisho.',
    wonTourn: 'Ulishinda mashindano.',
    lostTourn: 'Unapoteza mashindano.',
    tournamentStart: "Mashindano tayari yameanza.",
    deviceTokenError: "Hitilafu fulani imetokea. Tafadhali anzisha upya programu."
}

module.exports.translateToSwahili = async (text) => {
    try {
        const translatedText = await translate(text, { to: 'sw' });
        return translatedText

    } catch (error) {
        console.error('Translation error:', error);
    }
}

// console.log(this.translateToSwahili('Tournament unregistered successfully.'))



const func = async () => {
    const obj = {}
    for (let i in this.messages) {
        obj[i] = await this.translateToSwahili(this.messages[i])
    }
    console.log('obj', obj)

}


//func()


// app constants

module.exports.gameConstants = {
    gameType: ['googlePlay', 'gameCenter'],
    termsConditions: "sfsdhbfjfgjkghk",
    privacyPolicy: "asfsfgsafgafafaf",
    rules: "sfsfgsgs",
    regexForMongoId: /^[0-9a-zA-Z]{24}$/
}

//http status codes

module.exports.responseStatus = {
    created: 201,
    success: 200,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    serverError: 500,
}


module.exports.socketConstants = {
    opponentFound: "findMatchStatus",
    randomMatch: "randomMatch",
    sendMessage:"sendMessage",
    gameStart: "gameStart",
    bidRound: "bidRound",
    bidCard: "bidCard",
    playCard: "playCard",
    findMatchSuccess: "findMatchSuccess",
    opponentNotFound: "Opponent not Found",
    selfExit: "selfExit",
    playBidturn: "playBidTurn",
    playBidCard: "playBidCard",
    roundWinner: 'roundWinner',
    deckCard: 'deckCard',
    gameTurn: 'gameTurn',
    error: "error",
    updatedMatchDetails: "updatedMatchDetails",
    gameRequest: 'gameRequest',
    requestStatus: "requestStatus",
    coinsUpdate: "coinsUpdate",
    logout: "logout",
    gameState: "gameState",
    selfMatchDetails: "selfMatchDetails",
    chat: "chat",
    chatMessage: 'chatMessage',
    setLanguage: 'setLanguage',
    setLanguageSuccess: 'setLanguageSuccess',
    fixtureScreen: 'fixtureScreen',
    tournamentResult: 'tournamentResult',
    lastGameStatus: 'lastGameStatus',
    gameWin: 'gameWin',
    gameWinSuccess: 'gameWinSuccess'

}


module.exports.shopConstants = {
    'Winter Theme': 'Mandhari ya msimu wa baridi',
    'Golden Deck': 'Dawati la Dhahabu',
    'emoji 1': 'emoji 1',
    'emoji 2': 'emoji 2',
    'emoji 3': 'emoji 3'
}



module.exports.getBadge = (coins, aggregate = true) => {

    if (aggregate) {
        let key = coins ? coins : '$coins'
        return {
            $switch: {
                branches: [
                    { case: { $lte: [key, 50] }, then: null },
                    { case: { $and: [{ $gt: [key, 50] }, { $lte: [key, 2500] }] }, then: "bronze" },
                    { case: { $and: [{ $gt: [key, 2500] }, { $lte: [key, 10000] }] }, then: "silver" },
                    { case: { $and: [{ $gt: [key, 10000] }, { $lte: [key, 50000] }] }, then: "gold" },
                    { case: { $gt: [key, 50000] }, then: "diamond" }
                ],
                default: "unrecognised batch"
            }

        }
    }
    else {
        let badge = null

        if (coins < 50) badge = null
        else if (coins > 50 && coins <= 2500) badge = "bronze"
        else if (coins > 2500 && coins <= 10000) badge = "silver"
        else if (coins > 10000 && coins <= 50000) badge = "gold"
        else if (coins > 50000) badge = "diamond"
        else badge = "unrecognised batch"
        return badge
    }

}



// const lan = async () => {
//     const obj = {}
//     // let dataObj = {
//     //     name: "Winter Theme"
//     // }
//     let shopAlter = ["Winter Theme", "Golden Deck", "emoji 1", "emoji 2", "emoji 3"]
//     for (let i of shopAlter) {
//         obj[i] = await this.translateToSwahili(i)
//     }
//     console.log('obj', obj)
//     return await this.translateToSwahili('Please enter language.')
// }

// console.log(lan())

module.exports.typeOfVersion = {
    ios: "ios",
    android: "android"
}
