const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

const moment = require("moment");

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
    unapprovedExcused: 0,
};

// 관리자페이지 GET
router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                // 관리자 페이지 메인 탭 Header에 들어갈 데이터 가져오기
                // 전체 연구원 수, 출석 연구원 수, 미출석 연구원 수, 미승인 유고결석 개수
                // 전체 연구원 수
                const getAllUser = await pool.query(
                    "SELECT COUNT(*) AS 'users' FROM user"
                );
                header_data.users = getAllUser[0][0].users;
                // 금일 출석한 연구원 수, 미출석 연구원 수
                const getAttendedUser = await pool.query(
                    "SELECT COUNT(*) AS 'users' FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE()"
                );
                header_data.attendedUsers = getAttendedUser[0][0].users;
                header_data.absentedUsers =
                    header_data.users - header_data.attendedUsers;
                // 미승인 유고결석 개수
                const getUnapprovedExcused = await pool.query(
                    "SELECT COUNT(*) AS 'unapproved' FROM excused_absence WHERE status = ?",
                    ["승인 대기중"]
                );
                header_data.unapprovedExcused =
                    getUnapprovedExcused[0][0].unapproved;

                data.isAdmin = req.session.isAdmin;
                return res.render("admin", {
                    data: data,
                    header_data: header_data,
                });
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

// Admin-User
router.get("/admin-user", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                let key = req.query.key;
                if (key == undefined) {
                    key = moment().format("YYYY-MM-DD");
                }
                // 관리자 페이지 연구원 관리 탭에 들어갈 데이터 가져오기
                // 전체 연구원, 출석 상태 확인을 위한 오늘 날짜의 출석 데이터
                const getAllMember = await pool.query(
                    "SELECT a.uid, a.uname, a.upw, a.seat, DATE_FORMAT(b.date, '%H시%i분%s초') AS 'in', DATE_FORMAT(c.date, '%H시%i분%s초') AS 'out' FROM user AS a LEFT JOIN check_in AS b ON a.uid = b.uid AND DATE_FORMAT(b.date, '%Y-%m-%d') = ? LEFT JOIN check_out AS c ON a.uid = c.uid AND DATE_FORMAT(c.date, '%Y-%m-%d') = ?;",
                    [key, key]
                );
                // console.log(getAllMember[0].length)
                data.isAdmin = req.session.isAdmin;
                return res.render("admin-user", {
                    data: data,
                    bodydata: getAllMember[0],
                    key: key,
                });
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

// Admin-Absent
router.get("/admin-absent", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                data.isAdmin = req.session.isAdmin;
                // 유고결석 테이블 데이터 가져오기
                const getAbsentData = await pool.query(
                    "SELECT a.no, a.uid, b.uname, a.status, a.wdate, a.context, a.file FROM excused_absence AS a LEFT JOIN user AS b ON a.uid = b.uid ORDER BY no DESC"
                );
                return res.render("admin-absent", {
                    data: data,
                    bodydata: getAbsentData[0],
                });
            } catch (error) {
                console.log(error);
                return res.redirect("/error");
            }
        }
    }
});

// 관리자 페이지 사용자 추가
router.post("/adduser", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            const {
                body: { studentcode, username, userpwd, userseat },
            } = req;
            if (
                studentcode === "" ||
                username === "" ||
                userpwd === "" ||
                userseat == ""
            ) {
                return res.send(
                    "<script>alert('공란이 있습니다.'); history.go(-1);</script>"
                );
            } else {
                try {
                    // 사용자 테이블에 값 추가
                    const addUser = await pool.query(
                        "INSERT INTO user VALUES (?, ?, ?, ?)",
                        [studentcode, userpwd, username, userseat]
                    );
                    return res.send(
                        "<script>alert('사용자를 추가했습니다.'); location.href='/admin/admin-user';</script>"
                    );
                } catch (error) {
                    console.log(error);
                    res.redirect("/error");
                }
            }
        }
    }
});

// 관리자 페이지 사용자 수정
router.post("/edituser", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                const {
                    body: { studentcode, username, userupw, userseat },
                } = req;
                const editUser = await pool.query(
                    "UPDATE user SET uid = ?, upw = ?, uname = ?, seat = ? WHERE uid = ?",
                    [studentcode, userupw, username, userseat, req.session.uid]
                );
                return res.send(
                    "<script>alert('사용자 수정을 완료했습니다.'); location.href='/admin/admin-user';</script>"
                );
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

// 관리자 페이지 사용자 삭제
router.post("/deleteuser", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                const {
                    body: { studentcode },
                } = req;
                // 사용자 삭제 코드
                console.log(studentcode);
                const deleteUser = await pool.query(
                    "DELETE FROM user WHERE uid = ?",
                    [studentcode]
                );
                return res.send(
                    "<script>alert('사용자를 삭제했습니다.'); location.href='/admin/admin-user';</script>"
                );
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

// 유고결석 승인
router.post("/accessabsent", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                const {
                    body: { no },
                } = req;
                const updateStatus = await pool.query(
                    "UPDATE excused_absence SET status = '승인 완료' WHERE no = ?",
                    [no]
                );
                return res.send(
                    "<script>alert('유고결석을 승인했습니다.'); location.href='/admin/admin-absent';</script>"
                );
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});
// 유고결석 거절
router.post("/denyabsent", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                const {
                    body: { no },
                } = req;
                const updateStatus = await pool.query(
                    "UPDATE excused_absence SET status = '승인 거절' WHERE no = ?",
                    [no]
                );
                return res.send(
                    "<script>alert('유고결석을 거절했습니다.'); location.href='/admin/admin-absent';</script>"
                );
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

// 공지사항 관리 페이지
router.get("/manage/notice", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
            if (req.session.isAdmin != true) {
                res.redirect("/");
            } else {
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                data.isAdmin = req.session.isAdmin;
                const notice = await pool.query("SELECT * FROM notice;");
                return res.render("manage-notice", {
                    data: data,
                    notice: notice[0],
                    options: {},
                });
            }
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});

router.post("/manage/notice", async (req, res, next) => {
    const { keyword, s_date, e_date } = req.body;
    let notice = {};
    let options = {};
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                data.isAdmin = req.session.isAdmin;
                if (keyword != "" && s_date != "" && s_date != "") {
                    notice = await pool.query(
                        "SELECT * FROM notice WHERE title LIKE ? AND wdate BETWEEN ? AND ? ORDER BY wdate desc, no;",
                        ["%" + keyword + "%", s_date, e_date]
                    );
                    options.keyword = keyword;
                    options.s_date = s_date;
                    options.e_date = e_date;
                } else {
                    if (keyword != "") {
                        notice = await pool.query(
                            "SELECT * FROM notice WHERE title LIKE ? ORDER BY wdate desc, no;;",
                            ["%" + keyword + "%"]
                        );
                        options.keyword = keyword;
                    } else {
                        if (s_date != "" && e_date != "") {
                            notice = await pool.query(
                                "SELECT * FROM notice WHERE wdate BETWEEN ? AND ? ORDER BY wdate desc, no;;",
                                [s_date, e_date]
                            );
                            options.s_date = s_date;
                            options.e_date = e_date;
                        } else {
                            res.redirect("/admin/manage/notice");
                        }
                    }
                }
                return res.render("manage-notice", {
                    data: data,
                    notice: notice[0],
                    options: options,
                });
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

router.get("/manage/notice/:no", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            data.uid = req.session.uid;
            data.uname = req.session.uname;
            data.isAdmin = req.session.isAdmin;
            const notice = await pool.query(
                "SELECT * FROM notice WHERE no = ?;",
                [req.params.no]
            );
            return res.render("manage-notice-detail", {
                data: data,
                notice: notice[0],
                options: {},
            });
        }
    }
});

router.post("/manage/notice/del", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                data.isAdmin = req.session.isAdmin;
                const notice = await pool.query(
                    "DELETE FROM notice WHERE no = ?;",
                    [req.body.no]
                );
                res.redirect("/admin/manage/notice");
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

router.get("/create/notice/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                data.uid = req.session.uid;
                data.uname = req.session.uname;
                data.isAdmin = req.session.isAdmin;
                return res.render("create-notice", {
                    data: data,
                });
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

router.post("/create/notice/", async (req, res, next) => {
    const { title, detail } = req.body;
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        if (req.session.isAdmin != true) {
            res.redirect("/");
        } else {
            try {
                const notice = await pool.query(
                    "INSERT INTO notice VALUES (null, ?, ?, ?, 0);",
                    [title, detail, new Date()]
                );
                return res.redirect("/admin/manage/notice");
            } catch (error) {
                console.log(error);
                res.redirect("/error");
            }
        }
    }
});

module.exports = router;
