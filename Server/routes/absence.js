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

// 유고결석 페이지 접속
router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
            // 페이지 상단 유고결석 관련 수치 표시
            let num_absence = {
                제출: 0,
                "승인 대기중": 0,
                "승인 완료": 0,
                "승인 거절": 0,
            };
            // DB에서 해당 인원에 대한 유고결석 정보를 가져옴
            const absence = await pool.query(
                "SELECT * FROM excused_absence WHERE uid = ? ORDER BY wdate desc;",
                [req.session.uid]
            );
            // 가져온 정보에 따라 num_absence값 변경
            absence[0].forEach((e) => {
                num_absence["제출"] += 1;
                num_absence[e.status] += 1;
            });
            data.uid = req.session.uid;
            data.uname = req.session.uname;
            data.isAdmin = req.session.isAdmin;
            res.render("absence", {
                data: data,
                absence: absence[0],
                num_absence: num_absence,
            });
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});

// 유고결석 작성 페이지 접속
router.get("/create", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
            data.title = "융합연구소출석관리서비스 | 유고결석 사유서 작성";
            data.uid = req.session.uid;
            data.uname = req.session.uname;
            data.seat = req.session.seat;
            data.isAdmin = req.session.isAdmin;
            res.render("create-absence", { data: data });
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});

// 유고결석 작성
router.post("/create", async (req, res, next) => {
    const { student_num, student_name, seat_num, s_date, e_date, reason } =
        req.body;
    try {
        const now = new Date();
        // DB에 작성한 유고결석사유서 삽입
        const absence = await pool.query(
            "INSERT INTO excused_absence VALUES(null, ?, ?, ?, null, ?, ?)",
            [reason, s_date + " ~ " + e_date, now, "승인 대기중", student_num]
        );
        res.redirect("/absence");
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
});

module.exports = router;
