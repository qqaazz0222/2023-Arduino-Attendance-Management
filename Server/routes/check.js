const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

let data = {
    title: "융합연구소출석관리서비스 | 출석체크",
    uid: "",
    uname: "",
    errMsg: "",
};

router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        let yy = String(year);
        let mm = String(month);
        if (mm.length == 1) {
            mm = "0" + mm;
        }
        const path = "/check/" + yy + "/" + mm;
        res.redirect(path);
    }
});

router.get("/:year/:month", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        let searchPeriod = ["", ""];
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);
        let yy = String(year);
        let mm = String(month);
        if (mm.length == 1) {
            mm = "0" + mm;
        }
        const check_in = await pool.query(
            "SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m') = ? AND uid = ?;",
            [String(year) + "-" + mm, req.session.uid]
        );
        const check_out = await pool.query(
            "SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m') = ? AND uid = ?;",
            [String(year) + "-" + mm, req.session.uid]
        );
        data.isAdmin = req.session.isAdmin;
        data.uid = req.session.uid;
        data.uname = req.session.uname;
        res.render("check", {
            data: data,
            year: yy,
            month: mm,
            check_in: check_in[0],
            check_out: check_out[0],
        });
    }
});

module.exports = router;
