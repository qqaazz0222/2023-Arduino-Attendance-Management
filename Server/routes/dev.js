const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

let data = {
    title: "융합연구소출석관리서비스 | 로그인",
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
        const day = date.getDate();
        let yyyy = String(year);
        let mm = String(month);
        if (mm.length == 1) {
            mm = "0" + mm;
        }
        let dd = String(day);

        const check_in = await pool.query(
            "SELECT * FROM user LEFT OUTER JOIN (SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = ?) ON user.uid = check_in.uid ;",
            [yyyy + "-" + mm + "-" + dd]
        );
        const check_out = await pool.query(
            "SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m-%d') = ?;",
            [yyyy + "-" + mm + "-" + dd]
        );
        console.log(check_in[0], check_out[0]);
        data.uid = req.session.uid;
        data.uname = req.session.uname;
        res.render("dev", {
            data: data,
        });
    }
});

module.exports = router;
