const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

const today = new Date();
const date = {
    year: today.getFullYear(),
    month: today.getMonth(),
    date: today.getDate()
}

let data = {
    title: "융합연구소출석관리서비스 | 출석체크",
    uid: "",
    uname: "",
    errMsg: "",
};

let header_data = {
    users: 0,
    attendedUsers: 0,
    absentedUsers: 0,
    unapprovedExcused: 0
}

let panel_user = {
    users: []
}

// 관리자페이지 GET
router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        data.uid = req.session.uid;
        data.uname = req.session.uname;

        // 관리자 페이지 메인 탭 Header에 들어갈 데이터 가져오기
        // 전체 연구원 수, 출석 연구원 수, 미출석 연구원 수, 미승인 유고결석 개수
        // 전체 연구원 수
        const getAllUser = await pool.query(
            "SELECT COUNT(*) AS 'users' FROM user"
        )
        header_data.users = getAllUser[0][0].users
        // 금일 출석한 연구원 수, 미출석 연구원 수
        const getAttendedUser = await pool.query(
            "SELECT COUNT(*) AS 'users' FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE()" 
        )
        header_data.attendedUsers = getAttendedUser[0][0].users
        header_data.absentedUsers = header_data.users - header_data.attendedUsers
        // 미승인 유고결석 개수
        const getUnapprovedExcused = await pool.query(
            "SELECT COUNT(*) AS 'unapproved' FROM excused_absence WHERE status = ?",
            ["승인 대기중"]
        )
        header_data.unapprovedExcused = getUnapprovedExcused[0][0].unapproved

        // 관리자 페이지 연구원 관리 탭에 들어갈 데이터 가져오기
        // 전체 연구원, 출석 상태 확인을 위한 오늘 날짜의 출석 데이터
        const getAllMember = await pool.query(
            "SELECT a.uid, a.uname, a.upw, a.seat, DATE_FORMAT(b.date, '%H시%i분%s초') AS 'in', DATE_FORMAT(c.date, '%H시%i분%초') AS 'out' FROM user AS a LEFT JOIN check_in AS b ON a.uid = b.uid AND DATE_FORMAT(b.date, '%Y-%m-%d') = CURDATE() LEFT JOIN check_out AS c ON a.uid = c.uid AND DATE_FORMAT(c.date, '%Y-%m-%d') = CURDATE();"
        )
        panel_user = getAllMember[0];
        // 입실 시간, 퇴실 시간
        return res.render("admin", {
            data: data,
            header_data: header_data,
            panel_user: panel_user
        })
    }
})

// 관리자 페이지 사용자 추가
router.post("/adduser", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        const {
            body: { studentcode, username, userpwd, userseat }
        } = req;
        if ( studentcode === "" || username === "" || userpwd === "" || userseat == "") {
            return res.send("<script>alert('공란이 있습니다.'); history.go(-1);</script>");
        } else {
            try {
                // 사용자 테이블에 값 추가
                const addUser = await pool.query(
                    "INSERT INTO user VALUES (?, ?, ?, ?)",
                    [studentcode, userpwd, username, userseat]
                )
                return res.redirect("/admin");
            } catch (error) {
                return res.redirect("/");
            }
        }
    }
})

// 관리자 페이지 사용자 수정
router.post("/edituser", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        const {
            body: { studentcode, username, userupw, userseat }
        } = req;
        const editUser = await pool.query(
            "UPDATE user SET uid = ?, upw = ?, uname = ?, seat = ? WHERE uid = ?",
            [studentcode, userupw, username, userseat, req.session.uid]
        )
        return res.redirect("/admin");
    }
})

// 관리자 페이지 사용자 삭제
router.post("/deleteuser", async(req, res, next) => {
    try {
        if (req.session.isLogined == undefined) {
            res.redirect("/sign");
        } else {
            const {
                body: { studentcode }
            } = req;
            // 사용자 삭제 코드
            console.log(studentcode)
            const deleteUser = await pool.query(
                "DELETE FROM user WHERE uid = ?",
                [studentcode]
            );
            return res.redirect("/admin");
        }
    } catch (error) {
        console.log(error);
        // Error Page
    }
})


module.exports = router;