const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

let data = {
    title: "융합연구소출석관리서비스 | 임시 출석 기능",
    uid: "",
    uname: "",
    errMsg: "",
};

// ** 해당 페이지는 아두이노로 디바이스 개발 완료시, 사용하지 않을 예정
// 인원 출석, 퇴실 시간 설정 페이지 접속
router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        // 관리자가 아니면 메인 페이지로 이동
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                // 오늘 날짜 받아와 yyyy-mm-dd 형식으로 변경
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

                // DB에서 출석 정보 가져오기
                const check_in = await pool.query(
                    "WITH TEMP_TABLE as (SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = ?) SELECT user.uid, user.uname, TEMP_TABLE.no, TEMP_TABLE.date FROM user LEFT JOIN TEMP_TABLE ON user.uid = TEMP_TABLE.uid ORDER BY user.uid;",
                    [yyyy + "-" + mm + "-" + dd]
                );
                // DB에서 퇴실 정보 가져오기
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
            // 오늘 날짜 받아와 yyyy-mm-dd 형식으로 변경
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
            // 출석 시간에 대한 처리
            if (intime != "") {
                // 해당 일에 이미 출석 시간이 저장되어 있는 지 확인
                const check_in_already = await pool.query(
                    "SELECT * FROM check_in WHERE uid = ? AND DATE_FORMAT(date, '%Y-%m-%d') = ?;",
                    [uid, yyyy + "-" + mm + "-" + dd]
                );
                // 저장되어 있는 출석 시간이 있을 때 처리
                if (check_in_already[0].length != 0) {
                    // DB에 새로 입력받은 출석 시간을 업데이트
                    const chg_in_time = await pool.query(
                        "UPDATE check_in SET date = ? WHERE no = ?;",
                        [
                            yyyy + "-" + mm + "-" + dd + " " + intime + ":00",
                            check_in_already[0][0].no,
                        ]
                    );
                    // 저장되어 있는 출석 시간이 없을 때 처리
                } else {
                    // DB에 새로 입력받은 출석 시간을 삽입
                    const add_in_time = await pool.query(
                        "INSERT INTO check_in VALUES (null, ?, ?);",
                        [yyyy + "-" + mm + "-" + dd + " " + intime + ":00", uid]
                    );
                }
            }
            // 퇴실 시간에 대한 처리
            if (outtime != "") {
                // 해당 일에 이미 퇴실 시간이 저장되어 있는 지 확인
                const check_out_already = await pool.query(
                    "SELECT * FROM check_out WHERE uid = ? AND DATE_FORMAT(date, '%Y-%m-%d') = ?;",
                    [uid, yyyy + "-" + mm + "-" + dd]
                );
                // 저장되어 있는 퇴실 시간이 있을 때 처리
                if (check_out_already[0].length != 0) {
                    // DB에 새로 입력받은 퇴실 시간을 업데이트
                    const chg_out_time = await pool.query(
                        "UPDATE check_out SET date = ? WHERE no = ?;",
                        [
                            yyyy + "-" + mm + "-" + dd + " " + outtime + ":00",
                            check_out_already[0][0].no,
                        ]
                    );
                    // 저장되어 있는 퇴실 시간이 없을 때 처리
                } else {
                    // DB에 새로 입력받은 퇴실 시간을 삽입
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

router.get("/check", async (req, res, next) => {
    try {
        res.render("dev-check", {
            data: data,
        });
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
});

router.post("/check/:type", async (req, res, next) => {
    try {
        const date = new Date();
        const hh = date.getHours();
        const mm = date.getMinutes();
        const type = req.params.type;
        const uid = req.body.id;
        console.log(date);

        const isUser = await pool.query("SELECT * FROM user WHERE uid = ?", [
            uid,
        ]);
        if (isUser[0].length == 0) {
            return res.send(
                "<script>alert('AI+X 융합연구소 연구원이 아닙니다.'); location.href='/dev/check';</script>"
            );
        } else {
            if (type == "in") {
                // 현재 입실 상태 확인
                const getTodayCheckIn = await pool.query(
                    "SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE() AND uid = ?",
                    [uid]
                );
                // 예외처리
                if (getTodayCheckIn[0].length > 0) {
                    return res.send(
                        "<script>alert('이미 입실하셨습니다.'); location.href='/dev/check';</script>"
                    );
                } else {
                    // 입실 상태 추가
                    const SetCheckIn = await pool.query(
                        "INSERT INTO check_in VALUES(null, NOW(), ?)",
                        [uid]
                    );
                    return res.send(
                        `<script>alert('${hh}:${mm} 입실처리 되었습니다. 공부 열심히하세요!'); location.href='/dev/check';</script>`
                    );
                }
                // isCheckIn이 true이면 현재 사용자는 출석버튼을 누른 상태
            } else {
                // 현재 입실 상태 확인
                const getTodayCheckIn = await pool.query(
                    "SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE() AND uid = ?",
                    [uid]
                );
                // 현재 퇴실 상태 확인
                const getTodayCheckOut = await pool.query(
                    "SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE() AND uid = ?",
                    [uid]
                );
                if (getTodayCheckIn[0].length == 0) {
                    return res.send(
                        "<script>alert('아직 입실하지 않았습니다.'); location.href='/dev/check';</script>"
                    );
                } else if (getTodayCheckOut[0].length > 0) {
                    return res.send(
                        "<script>alert('이미 퇴실하셨습니다.'); location.href='/dev/check';</script>"
                    );
                } else {
                    // 퇴실 상태 추가
                    const SetCheckOut = await pool.query(
                        "INSERT INTO check_out VALUES(null, NOW(), ?)",
                        [uid]
                    );
                    return res.send(
                        "<script>alert('퇴실처리 되었습니다. 오늘도 수고하셨습니다!'); location.href='/dev/check';</script>"
                    );
                }
            }
        }
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
});
module.exports = router;
