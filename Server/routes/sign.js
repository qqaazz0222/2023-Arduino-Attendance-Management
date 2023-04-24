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
    try {
        if (req.session.uid) {
            delete req.session.uid;
            delete req.session.uname;
            delete req.session.isLogined;
            req.session.save(function () {
                res.redirect("/");
            });
        } else {
            res.render("sign", { data: data });
        }
    } catch (error) {
        return res.redirect("/error");
    }
});

router.post("/", async (req, res, next) => {
    const { id, pw } = req.body;
    try {
        const user = await pool.query("SELECT * FROM user WHERE uid = ?", [id]);
        console.log(user[0]);
        if (user[0].length > 0) {
            if (pw === user[0][0].upw) {
                req.session.uid = user[0][0].uid;
                req.session.uname = user[0][0].uname;
                req.session.isLogined = true;
                req.session.save(function () {
                    res.redirect("/");
                });
            } else {
                data.errMsg = "* 잘못된 비밀번호입니다. 다시 확인하세요.";
                res.render("sign", { data: data });
            }
        } else {
            data.errMsg = "* 아이디가 존재하지 않습니다.";
            res.render("sign", { data: data });
        }
    } catch (error) {
        res.redirect("/error");
    }
});

module.exports = router;
