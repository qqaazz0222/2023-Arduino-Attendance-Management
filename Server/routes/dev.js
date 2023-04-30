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
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
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
                    "WITH TEMP_TABLE as (SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = ?) SELECT user.uid, user.uname, TEMP_TABLE.no, TEMP_TABLE.date FROM user LEFT JOIN TEMP_TABLE ON user.uid = TEMP_TABLE.uid ORDER BY user.uid;",
                    [yyyy + "-" + mm + "-" + dd]
                );
                const check_out = await pool.query(
                    "WITH TEMP_TABLE as (SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m-%d') = ?) SELECT user.uid, user.uname, TEMP_TABLE.no, TEMP_TABLE.date FROM user LEFT JOIN TEMP_TABLE ON user.uid = TEMP_TABLE.uid ORDER BY user.uid;",
                    [yyyy + "-" + mm + "-" + dd]
                );
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                data.isAdmin = req.session.isAdmin;
                res.render("dev", {
                    data: data,
                    check_in: check_in[0],
                    check_out: check_out[0],
                });
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

router.post("/save", async (req, res, next) => {
    if (req.session.isAdmin != true) {
        res.redirect("/");
    } else {
        try {
            const { uid, intime, outtime } = req.body;
            console.log(typeof outtime);
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
            if (intime != "") {
                const check_in_already = await pool.query(
                    "SELECT * FROM check_in WHERE uid = ? AND DATE_FORMAT(date, '%Y-%m-%d') = ?;",
                    [uid, yyyy + "-" + mm + "-" + dd]
                );

                if (check_in_already[0].length != 0) {
                    const chg_in_time = await pool.query(
                        "UPDATE check_in SET date = ? WHERE no = ?;",
                        [
                            yyyy + "-" + mm + "-" + dd + " " + intime + ":00",
                            check_in_already[0][0].no,
                        ]
                    );
                } else {
                    const add_in_time = await pool.query(
                        "INSERT INTO check_in VALUES (null, ?, ?);",
                        [yyyy + "-" + mm + "-" + dd + " " + intime + ":00", uid]
                    );
                }
            }
            if (outtime != "") {
                const check_out_already = await pool.query(
                    "SELECT * FROM check_out WHERE uid = ? AND DATE_FORMAT(date, '%Y-%m-%d') = ?;",
                    [uid, yyyy + "-" + mm + "-" + dd]
                );
                if (check_out_already[0].length != 0) {
                    const chg_out_time = await pool.query(
                        "UPDATE check_out SET date = ? WHERE no = ?;",
                        [
                            yyyy + "-" + mm + "-" + dd + " " + outtime + ":00",
                            check_out_already[0][0].no,
                        ]
                    );
                } else {
                    const add_out_time = await pool.query(
                        "INSERT INTO check_out VALUES (null, ?, ?);",
                        [
                            yyyy + "-" + mm + "-" + dd + " " + outtime + ":00",
                            uid,
                        ]
                    );
                }
            }
            res.redirect("/dev");
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});
module.exports = router;
