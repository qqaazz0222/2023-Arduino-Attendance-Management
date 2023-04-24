const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

let data = {
    title: "융합연구소출석관리서비스 | 유고결석",
    uid: "",
    uname: "",
    errMsg: "",
};

router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        data.uid = req.session.uid;
        data.uname = req.session.uname;
        res.render("absence", { data: data });
    }
});

module.exports = router;
