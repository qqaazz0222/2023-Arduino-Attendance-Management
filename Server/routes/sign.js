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

// 로그인 페이지 접속
router.get("/", async (req, res, next) => {
    try {
        if (req.session.uid) {
            // 세션 삭제
            delete req.session.uid;
            delete req.session.uname;
            delete req.session.isLogined;
            delete req.session.isAdmin;
            delete req.session.seat;
            req.session.save(function () {
                res.redirect("/");
            });
        } else {
            // 로그인 페이지로 이동
            res.render("sign", { data: data });
        }
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
});

// 로그인 동작
router.post("/", async (req, res, next) => {
    const { id, pw } = req.body;
    try {
        // DB에서 회원 정보 가져오기
        const user = await pool.query("SELECT * FROM user WHERE uid = ?", [id]);
        // 아이디 유효상 검사
        if (user[0].length > 0) {
            // 비밀번호 일치 검사
            if (pw === user[0][0].upw) {
                const admin = await pool.query(
                    "SELECT * FROM admin WHERE aid = ?",
                    [id]
                );
                // 관리자 확인
                if (admin[0] != 0) {
                    req.session.isAdmin = true;
                } else {
                    req.session.isAdmin = false;
                }
                req.session.uid = user[0][0].uid;
                req.session.uname = user[0][0].uname;
                req.session.seat = user[0][0].seat;
                req.session.isLogined = true;
                req.session.save(function () {
                    res.redirect("/");
                });
            } else {
                // 비밀번호 불일치
                data.errMsg = "* 잘못된 비밀번호입니다. 다시 확인하세요.";
                res.render("sign", { data: data });
            }
        } else {
            // 아이디 없음
            data.errMsg = "* 아이디가 존재하지 않습니다.";
            res.render("sign", { data: data });
        }
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
});

module.exports = router;
