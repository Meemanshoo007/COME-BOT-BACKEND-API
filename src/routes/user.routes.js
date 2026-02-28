const express = require("express");
const { listUsers, updateXP } = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);
router.get("/", listUsers);
router.patch("/:id/xp", updateXP);

module.exports = router;
