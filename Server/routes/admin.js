const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

const moment = require("moment");
// const XlsxPopulate = require("xlsx-populate");
const XLSX = require("xlsx");
const fs = require("fs");

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
  date: moment().format("YYYY년 MM월 DD일"),
  weekData: [],
  start: 0,
  end: 0,
};

const getWeek = async (gap) => {
  // 이번주 날짜 구하기
  let startInit = new Date();
  let endInit = new Date();
  let dstartInit = new Date();
  let dendInit = new Date();
  startInit.setDate(startInit.getDate() - startInit.getDay() + gap * 7);
  endInit.setDate(endInit.getDate() - endInit.getDay() + gap * 7 + 7);
  start = startInit.getFullYear() + "-" + ("0" + (startInit.getMonth() + 1)).slice(-2) + "-" + ("0" + startInit.getDate()).slice(-2);
  end = endInit.getFullYear() + "-" + ("0" + (endInit.getMonth() + 1)).slice(-2) + "-" + ("0" + endInit.getDate()).slice(-2);
  // Header에 이번 주 월~금 날짜 넣기
  dstartInit.setDate(dstartInit.getDate() - dstartInit.getDay() + gap * 7 + 1);
  dendInit.setDate(dendInit.getDate() - dendInit.getDay() + gap * 7 + 5);
  dstart = dstartInit.getFullYear() + "-" + ("0" + (dstartInit.getMonth() + 1)).slice(-2) + "-" + ("0" + dstartInit.getDate()).slice(-2);
  dend = dendInit.getFullYear() + "-" + ("0" + (dendInit.getMonth() + 1)).slice(-2) + "-" + ("0" + dendInit.getDate()).slice(-2);
  header_data.start = dstart;
  header_data.end = dend;
  // Algorithm for Attendances a week
  const getUsers = await pool.query("SELECT uid, uname from user");
  let attendancesWeek2 = {};
  getUsers[0].forEach((e) => {
    attendancesWeek2[e.uid] = {
      name: [e.uname],
      0: "미출석",
      1: "미출석",
      2: "미출석",
      3: "미출석",
      4: "미출석",
      clr: {
        0: "#666",
        1: "#666",
        2: "#666",
        3: "#666",
        4: "#666",
      },
      hour: {
        0: "",
        1: "",
        2: "",
        3: "",
        4: "",
      },
      checkin: {
        0: null,
        1: null,
        2: null,
        3: null,
        4: null,
      },
    };
  });

  const get_checkIn = await pool.query("SELECT *, WEEKDAY(date) AS day FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') BETWEEN ? AND ? ORDER BY uid ASC;", [
    dstart,
    dend,
  ]);

  const get_checkOut = await pool.query(
    "SELECT *, WEEKDAY(date) AS day  FROM check_out WHERE DATE_FORMAT(date, '%Y-%m-%d') BETWEEN ? AND ? ORDER BY uid ASC;",
    [dstart, dend]
  );

  get_checkIn[0].forEach((e) => {
    attendancesWeek2[e.uid][e.day] = "입실";
    attendancesWeek2[e.uid]["hour"][e.day] = "";
    attendancesWeek2[e.uid]["clr"][e.day] = "#4169E1";
    attendancesWeek2[e.uid]["checkin"][e.day] = e.date;
  });

  get_checkOut[0].forEach((e) => {
    var chkin = new Date(attendancesWeek2[e.uid]["checkin"][e.day]);
    var chkout = new Date(e.date);
    var diff = Math.abs(parseInt((chkout.getTime() - chkin.getTime()) / (1000 * 60 * 60)));
    if (diff >= 4) {
      attendancesWeek2[e.uid][e.day] = "출석";
      attendancesWeek2[e.uid]["clr"][e.day] = "#008000";
    } else {
      attendancesWeek2[e.uid][e.day] = "시간부족";
      attendancesWeek2[e.uid]["clr"][e.day] = "#9B021D";
    }
    attendancesWeek2[e.uid]["hour"][e.day] = diff + "시간";
  });
  return attendancesWeek2;
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
        data.uname = req.session.uname;
        var currentNumber = req.query.currentNumber || 0;
        // 관리자 페이지 메인 탭 Header에 들어갈 데이터 가져오기
        // 전체 연구원 수, 출석 연구원 수, 미출석 연구원 수, 미승인 유고결석 개수
        // 전체 연구원 수
        const getAllUser = await pool.query("SELECT COUNT(*) AS 'users' FROM user");
        header_data.users = getAllUser[0][0].users;
        // 금일 출석한 연구원 수, 미출석 연구원 수
        const getAttendedUser = await pool.query("SELECT COUNT(*) AS 'users' FROM check_in WHERE DATE_FORMAT(date, '%Y-%m-%d') = CURDATE()");
        header_data.attendedUsers = getAttendedUser[0][0].users;
        header_data.absentedUsers = header_data.users - header_data.attendedUsers;
        // 미승인 유고결석 개수
        const getUnapprovedExcused = await pool.query("SELECT COUNT(*) AS 'unapproved' FROM excused_absence WHERE status = ?", ["승인 대기중"]);
        header_data.unapprovedExcused = getUnapprovedExcused[0][0].unapproved;

        header_data.weekData = await getWeek(currentNumber);
        return res.render("admin", {
          current_number: currentNumber,
          data: data,
          header_data: header_data,
        });
      } catch (error) {
        console.log(error);
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
          "SELECT a.uid, a.uname, a.upw, a.seat, DATE_FORMAT(b.date, '%H시%i분%s초') AS 'in', DATE_FORMAT(c.date, '%H시%i분%s초') AS 'out', TIMESTAMPDIFF(HOUR, b.date, c.date) AS hour FROM user AS a LEFT JOIN check_in AS b ON a.uid = b.uid AND DATE_FORMAT(b.date, '%Y-%m-%d') = ? LEFT JOIN check_out AS c ON a.uid = c.uid AND DATE_FORMAT(c.date, '%Y-%m-%d') = ? ORDER BY a.seat ASC;",
          [key, key]
        );
        console.log(getAllMember[0]);
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
        // 유고결석 테이블 데이터 가져오기
        const getAbsentData = await pool.query(
          "SELECT a.no, a.uid, b.uname, a.status, a.wdate, a.context, a.file, a.period FROM excused_absence AS a LEFT JOIN user AS b ON a.uid = b.uid ORDER BY no DESC"
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
      if (studentcode === "" || username === "" || userpwd === "" || userseat == "") {
        return res.send("<script>alert('공란이 있습니다.'); history.go(-1);</script>");
      } else {
        try {
          // 사용자 테이블에 값 추가
          const addUser = await pool.query("INSERT INTO user VALUES (?, ?, ?, ?)", [studentcode, userpwd, username, userseat]);
          return res.send("<script>alert('사용자를 추가했습니다.'); location.href='/admin/admin-user';</script>");
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
        const editUser = await pool.query("UPDATE user SET upw = ?, uname = ?, seat = ? WHERE uid = ?", [userupw, username, userseat, studentcode]);
        return res.send("<script>alert('사용자 수정을 완료했습니다.'); location.href='/admin/admin-user';</script>");
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
        const deleteUser = await pool.query("DELETE FROM user WHERE uid = ?", [studentcode]);
        return res.send("<script>alert('사용자를 삭제했습니다.'); location.href='/admin/admin-user';</script>");
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
        let no = req.query.no;
        console.log(no);
        const updateStatus = await pool.query("UPDATE excused_absence SET status = '승인 완료' WHERE no = ?", [no]);
        return res.send("<script>alert('유고결석을 승인했습니다.'); location.href='/admin/admin-absent';</script>");
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
        let no = req.query.no;
        const updateStatus = await pool.query("UPDATE excused_absence SET status = '승인 거절' WHERE no = ?", [no]);
        return res.send("<script>alert('유고결석을 거절했습니다.'); location.href='/admin/admin-absent';</script>");
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
          notice = await pool.query("SELECT * FROM notice WHERE title LIKE ? AND wdate BETWEEN ? AND ? ORDER BY wdate desc, no;", [
            "%" + keyword + "%",
            s_date,
            e_date,
          ]);
          options.keyword = keyword;
          options.s_date = s_date;
          options.e_date = e_date;
        } else {
          if (keyword != "") {
            notice = await pool.query("SELECT * FROM notice WHERE title LIKE ? ORDER BY wdate desc, no;;", ["%" + keyword + "%"]);
            options.keyword = keyword;
          } else {
            if (s_date != "" && e_date != "") {
              notice = await pool.query("SELECT * FROM notice WHERE wdate BETWEEN ? AND ? ORDER BY wdate desc, no;;", [s_date, e_date]);
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
      const notice = await pool.query("SELECT * FROM notice WHERE no = ?;", [req.params.no]);
      return res.render("manage-notice-detail", {
        data: data,
        notice: notice[0],
        options: {},
      });
    }
  }
});

router.post("/manage/notice/modify/:no", async (req, res, next) => {
  const { content } = req.body;
  if (req.session.isLogined == undefined) {
    res.redirect("/sign");
  } else {
    if (req.session.isAdmin != true) {
      res.redirect("/");
    } else {
      try {
        const noticeModify = await pool.query("UPDATE notice SET detail = ? WHERE no = ?;", [content, req.params.no]);
        return res.send(`<script>alert('수정되었습니다.'); location.href='/admin/manage/notice/${req.params.no}' ;</script>`);
      } catch (error) {
        console.log(error);
        res.redirect("/error");
      }
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
        const notice = await pool.query("DELETE FROM notice WHERE no = ?;", [req.body.no]);
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
        const notice = await pool.query("INSERT INTO notice VALUES (null, ?, ?, ?, 0);", [title, detail, new Date()]);
        return res.redirect("/admin/manage/notice");
      } catch (error) {
        console.log(error);
        res.redirect("/error");
      }
    }
  }
});

// 연구원 경고 관리 페이지
router.get("/warning", async (req, res, next) => {
  if (req.session.isLogined == undefined) {
    res.redirect("/sign");
  } else {
    if (req.session.isAdmin != true) {
      res.redirect("/");
    } else {
      try {
        return res.render("admin-warn", {
          data: data,
        });
      } catch (error) {
        console.log(error);
        res.redirect("/error");
      }
    }
  }
});

// 연구원 관리 엑셀 다운로드
router.post("/downloadexcel", async (req, res, next) => {
  if (req.session.isLogined == undefined) {
    res.redirect("/sign");
  } else {
    if (req.session.isAdmin != true) {
      res.redirect("/");
    } else {
      try {
        // 다운로드할 데이터의 날짜 가져오기
        const key = req.body.key;
        // DB에서 해당 날짜 데이터 가져오기
        const excelData = await pool.query(
          "SELECT a.uid, a.uname, a.upw, a.seat, DATE_FORMAT(b.date, '%H시%i분%s초') AS 'in', DATE_FORMAT(c.date, '%H시%i분%s초') AS 'out', TIMESTAMPDIFF(HOUR, b.date, c.date) AS hour FROM user AS a LEFT JOIN check_in AS b ON a.uid = b.uid AND DATE_FORMAT(b.date, '%Y-%m-%d') = ? LEFT JOIN check_out AS c ON a.uid = c.uid AND DATE_FORMAT(c.date, '%Y-%m-%d') = ? ORDER BY a.seat ASC;",
          [key, key]
        );

        try {
          // 엑셀 데이터 생성
          const data = [[key], ["학번", "이름", "좌석", "입실시간", "퇴실시간", "출석시간"]];

          for (const item of excelData[0]) {
            data.push([item.uid, item.uname, item.seat, item.in, item.out, item.hour]);
          }
          const worksheet = XLSX.utils.aoa_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

          // 엑셀 파일 저장
          const excelFilePath = "excel.xlsx";
          XLSX.writeFile(workbook, excelFilePath);

          // 파일 다운로드
          const fileStream = fs.createReadStream(excelFilePath);
          fileStream.on("open", () => {
            // key 를 문자형으로 변경
            const filename = "attendence";
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=${filename}.xlsx`);
            fileStream.pipe(res);
          });
          fileStream.on("error", (error) => {
            console.error("파일 읽기 오류:", error);
            res.status(500).send("파일 읽기 오류");
          });
          fileStream.on("end", () => {
            // 다운로드 후 파일 삭제
            fs.unlink(excelFilePath, (error) => {
              if (error) {
                console.error("파일 삭제 실패:", error);
              }
            });
          });
        } catch (error) {
          console.error("엑셀 파일 생성 및 다운로드 실패:", error);
          res.status(500).send("서버 오류");
        }
      } catch (error) {
        console.log(error);
        res.redirect("/error");
      }
    }
  }
});

module.exports = router;
