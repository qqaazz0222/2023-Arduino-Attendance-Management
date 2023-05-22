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

// 세션 사용 정의
router.use(
    session({
        secret: "sessionkey",
        resave: false,
        saveUninitialized: true,
        store: sessionStore,
    })
);

// 메인 페이지 접속
router.get("/", async (req, res, next) => {
    // 로그인 정보가 없을 때, 로그인 페이지로 이동
    if (req.session.isLogined == undefined) {
        // 임시 기능 페이지 이동
        res.redirect("/dev/check");
        // res.redirect("/sign");
    } else {
        try {
            // 메인 페이지 달력에 들어갈 출석 정보 받아오기
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
            // DB에서 기간에 해당하는 출석 정보 가져오기
            const check_in = await pool.query(
                "SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m') BETWEEN ? AND ? AND uid = ?;",
                [String(year) + "-" + m1, yy + "-" + m2, req.session.uid]
            );
            // DB에서 기간에 해당하는 퇴실 정보 가져오기
            const check_out = await pool.query(
                "SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m') BETWEEN ? AND ? AND uid = ?;",
                [String(year) + "-" + m1, yy + "-" + m2, req.session.uid]
            );
            // DB에서 메인 페이지 좌측 하단에 표시할 공지 정보 가져오기
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
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});

// 사용자 비밀번호 변경
router.post("/editpwd", async (req, res, next) => {
    // isUserLogined (사용자 로그인 여부 확인 절차)
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
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
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});

// / 입실 및 퇴실 ( 아두이노 연동 )
router.post("/checkin", async (req, res, next) => {
    try {
        // From Arduino
        // Seat Type : 101 ~ 122 || 실제 좌석 번호 : 1 ~ 22
        const { id } = req.body;
        seat_num = id - 100;

        //  좌석 정보에 해당하는 사용자 정보 가져오기
        const getUserData = await pool.query(
            "SELECT * FROM user WHERE seat = ?",
            [seat_num]
        );
        // 사용자 정보가 없을 때, 아두이노 서버로 에러 메시지 전송
        if (getUserData[0].length === 0) {
            return res.send({ result: "error" });
        }

        // 사용자 정보가 있을 때, 아두이노 서버로 사용자 정보 전송
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
        // 현재 입실 상태 확인
        const getTodayCheckIn = await pool.query(
            "SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE() AND uid = ?",
            [getUserData[0][0].uid]
        );
        // 현재 입실한 상태이면 퇴실 처리
        if (getTodayCheckIn[0].length > 0) {
            // 퇴실 상태 확인
            const getTodayCheckOut = await pool.query(
                "SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE() AND uid = ?",
                [getUserData[0][0].uid]
            );
            // 퇴실 상태라면 에러 메시지 전송
            if (getTodayCheckOut[0].length > 0) {
                return res.json({ result: "ERR" });
            }
            // 퇴실안한 상태라면 퇴실 처리
            // 퇴실 상태 추가
            const SetCheckOut = await pool.query(
                "INSERT INTO check_out VALUES(null, NOW(), ?)",
                [getUserData[0][0].uid]
            );
            return res.json({ result: "OUT" });
        } else {
            // 입실 상태 추가
            const SetCheckIn = await pool.query(
                "INSERT INTO check_in VALUES(null, NOW(), ?)",
                [getUserData[0][0].uid]
            );
            return res.json({ result: "INN" });
        }
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
});

// 입실 및 퇴실 ( 아두이노 연동 )
router.post("/checkin", async (req, res, next) => {
  // isUserLogined (사용자 로그인 여부 확인 절차)
  if (req.session.isLogined == undefined) {
    res.redirect("/sign");
  } else {
    try {
      // From Arduino
      // Seat Type : 101 ~ 122 || 실제 좌석 번호 : 1 ~ 22
      const { seat } = req.body;
      seat_num = seat - 100;

      //  좌석 정보에 해당하는 사용자 정보 가져오기
      const getUserData = await PoolConnection.query("SELECT * FROM user WHERE seat = ?", [seat_num]);
      // 사용자 정보가 없을 때, 아두이노 서버로 에러 메시지 전송
      if (getUserData[0].length === 0) {
        return res.send({ result: "error" });
      }

      // 사용자 정보가 있을 때, 아두이노 서버로 사용자 정보 전송
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
      // 현재 입실 상태 확인
      const getTodayCheckIn = await pool.query("SELECT * FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE() AND uid = ?", [getUserData[0][0].uid]);
      // 현재 입실한 상태이면 퇴실 처리
      if (getTodayCheckIn[0].length > 0) {
        // 퇴실 상태 확인
        const getTodayCheckOut = await pool.query("SELECT * FROM check_out WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE() AND uid = ?", [
          getUserData[0][0].uid,
        ]);
        // 퇴실 상태라면 에러 메시지 전송
        if (getTodayCheckOut[0].length > 0) {
          return res.send({ result: "error" });
        }
        // 퇴실안한 상태라면 퇴실 처리
        // 퇴실 상태 추가
        const SetCheckOut = await pool.query("INSERT INTO check_out VALUES(null, NOW(), ?)", [getUserData[0][0].uid]);
        return res.send({ result: "out" });
      } else {
        // 입실 상태 추가
        const SetCheckIn = await pool.query("INSERT INTO check_in VALUES(null, NOW(), ?)", [getUserData[0][0].uid]);
        return res.send({ result: "success" });
      }
    } catch (error) {
      console.log(error);
      res.redirect("/error");
    }
  }
});

router.get("/error", async (req, res, next) => {
    res.render("error", { data: data });
});

module.exports = router;
