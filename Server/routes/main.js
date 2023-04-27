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
        data.isAdmin = req.session.isAdmin;
        res.render("main", {
            data: data,
            check_in: check_in[0],
            check_out: check_out[0],
            notice: notice[0],
        });
    }
});

// 사용자 비밀번호 변경
router.post("/editpwd", async (req, res, next) => {
    // isUserLogined (사용자 로그인 여부 확인 절차)
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        // get elements from body
        const {
            body: { current_user_pwd, new_user_pwd, new_user_pwd_chk },
        } = req;
        // 비밀번호와 비밀번호 확인을 잘못 입력했을 때,
        // 해당 부분을 먼저 실행하는 이유는 효율성 측면에서 디비에 접근하기 전에
        // 서버 측면에서 선처리 하는 것.
        const special_pattern = /[`~!@#$%^&*|\\\'\";:\/?]/gi;
        if (
            new_user_pwd === "" ||
            new_user_pwd_chk === "" ||
            new_user_pwd.length < 8 ||
            new_user_pwd.length > 15 ||
            special_pattern.test(new_user_pwd) === false ||
            new_user_pwd !== new_user_pwd_chk
        ) {
            return res.send(
                "<script>alert('입력한 비밀번호를 규칙에 맞게 입력해주세요.'); history.go(-1);</script>"
            );
        }
        // check if last pwd is correct
        // 사용자가 입력한 현재 비밀번호와 일치하는 값을 찾는다.
        const chk_last_pwd = await pool.query(
            "SELECT * FROM user WHERE uid = ? AND upw = ?",
            [req.session.uid, current_user_pwd]
        );
        // 일치하지 않을 때, alert로 사용자에게 불일치 결과 출력
        if (chk_last_pwd[0].length === 0) {
            return res.send(
                "<script>alert('현재 비밀번호가 일치하지 않습니다.'); history.go(-1);</script>"
            );
        } else {
            // 바꾸려는 비밀번호와 현재 사용중인 비밀번호가 같을 때,
            if (new_user_pwd === chk_last_pwd[0][0].upw) {
                return res.send(
                    "<script>alert('현재 사용중인 비밀번호입니다!'); history.go(-1);</script>"
                );
            }
            // 모든 예외 통과, DB에 새로운 비밀번호 PUT
            const update_new_pwd = await pool.query(
                "UPDATE user SET upw = ? WHERE uid = ?",
                [new_user_pwd.toLowerCase(), req.session.uid]
            );
        }
        return res.send(
            "<script>alert('비밀번호를 변경했습니다.'); location.href='/';</script>"
        );
    }
});

router.get("/error", async (req, res, next) => {
    res.render("error", { data: data });
});

module.exports = router;
