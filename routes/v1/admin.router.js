const adminRoutes = require("express").Router();
const adminController = require("../../controllers/v1/admin.controller");

const { auth } = require("../../middlewares/auth");

const { validator } = require("../../middlewares/validator");
const validation = require("../../validations/user.validations");

const multer = require("../../middlewares/multer");

adminRoutes.post(
  "/login",
  validator(validation.adminLogin),
  adminController.login
);

adminRoutes.post(
  "/forgot",
  validator(validation.forgot),
  adminController.forgotPassword
);

adminRoutes.post(
  "/forgot-link",
  validator(validation.forgotLink),
  adminController.forgotLinkValid
);

adminRoutes.post(
  "/reset",
  validator(validation.resetPasswordAdmin),
  adminController.resetPassword
);

adminRoutes.post(
  "/change-password",
  auth,
  validator(validation.changePassword),
  adminController.changePassword
);

adminRoutes.post("/dashboard", auth, adminController.dashboard);

adminRoutes.post("/user-manual", auth, adminController.userList);

adminRoutes.post("/user-list", auth, adminController.userList);

adminRoutes.put("/block/:id", auth, adminController.block);

adminRoutes.post("/view", auth, adminController.userView);

adminRoutes.put("/user-edit", auth, multer, adminController.userEdit);
  
adminRoutes.post("/user-delete", auth, multer, adminController.userdelete);


adminRoutes.post(
  "/add-tournament",
  auth,
  validator(validation.addTournament),
  adminController.addTournament
);

adminRoutes.get("/tournament-list", auth, adminController.tournamentList);

adminRoutes.post("/fixture-screen", auth, adminController.tournamentFixture);

adminRoutes.post(
  "/tournament-admin-list",
  auth,
  adminController.tournamentListForAdmin
);

adminRoutes.get("/tournament-block/:id", auth, adminController.blockTournament);

adminRoutes.put("/tournament-edit", auth, adminController.editTournament);

adminRoutes.post(
  "/tournament-detail",
  auth,
  validator(validation.tournamentDetail),
  adminController.tournamentDetail
);

adminRoutes.put("/add-coins", auth, adminController.addCoins);

adminRoutes.post("/shop-list", auth, adminController.shopList);
adminRoutes.post("/shop-visitors-list", auth, adminController.shopVisitors);

adminRoutes.post(
  "/shop-add",
  auth,
  multer,
  validator(validation.addShopItem),
  adminController.addShop
);

adminRoutes.post("/shop-view", auth, adminController.shopView);

adminRoutes.post("/shop-delete", auth, adminController.shopDelete);

adminRoutes.post(
  "/shop-edit",
  auth,
  multer,
  validator(validation.editShopItem),
  adminController.shopEdit
);

adminRoutes.get("/logout", auth, adminController.logout);

adminRoutes.post("/notification", auth, adminController.sendNotification);

adminRoutes.post("/query-list", auth, adminController.QueryList);

adminRoutes.post("/notification-list", auth, adminController.notificationList);

adminRoutes.put(
  "/notification-edit",
  auth,
  validator(validation.notificationEdit),
  adminController.editNotification
);

adminRoutes.delete(
  "/notification-delete",
  auth,
  validator(validation.notificationEdit),
  adminController.deleteNotification
);

adminRoutes.post("/game-list", auth, adminController.gameList);

adminRoutes.get("/get-version", auth, adminController.getVersion);

adminRoutes.put(
  "/update-version",
  auth,
  validator(validation.versoinUpdate),
  adminController.updateVersion
);

adminRoutes.post(
  "/manual-user",
  auth,
  validator(validation.manualUser),
  adminController.addmanualUser
);

module.exports = adminRoutes;
