const express = require("express");
const session = require("express-session");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

let data = {
    title: "융합연구소출석관리서비스 | 홈",
    uid: "",
    uname: "",
};

router.use(
    session({
        secret: "sessionkey",
        resave: false,
        saveUninitialized: true,
        store: sessionStore,
    })
);

router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        let searchPeriod = ["", ""];
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        let yy = String(year);
        let m1 = String(month);
        let m2 = String(month + 1);
        if (month == 12) {
            yy = String(year + 1);
            mm = "01";
        }
        if (m1.length == 1) {
            m1 = "0" + m1;
        }
        if (m2.length == 1) {
            m2 = "0" + m2;
        }
        const check_in = await pool.query(
            "SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m') BETWEEN ? AND ? AND uid = ?;",
            [String(year) + "-" + m1, yy + "-" + m2, req.session.uid]
        );
        const check_out = await pool.query(
            "SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m') BETWEEN ? AND ? AND uid = ?;",
            [String(year) + "-" + m1, yy + "-" + m2, req.session.uid]
        );
        const notice = await pool.query(
            "SELECT * FROM notice ORDER BY no DESC LIMIT 4;"
        );
        data.uid = req.session.uid;
        data.uname = req.session.uname;
        res.render("main", {
            data: data,
            check_in: check_in[0],
            check_out: check_out[0],
            notice: notice[0],
        });
    }
});

router.get("/error", async (req, res, next) => {
    res.render("error", { data: data });
});

module.exports = router;
