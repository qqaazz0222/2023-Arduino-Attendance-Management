const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

router.get("/rulebook", (req, res, next) => {
    res.download("/files", "2022-1학기_AI+X융합연구소_연구공간규정(안)_v2.hwp");
});

module.exports = router;
