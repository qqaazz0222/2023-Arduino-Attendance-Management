const express = require("express");
const router = express.Router();
const pool = require("../db/db");
const sessionStore = require("../db/session");

let data = {
    title: "융합연구소출석관리서비스 | 공지사항",
    uid: "",
    uname: "",
    errMsg: "",
};

// 공지 페이지 접속
router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
            // DB에서 공지 no 내림차순으로 가져오기
            const notice = await pool.query(
                "SELECT * FROM notice ORDER BY no DESC;"
            );
            data.uid = req.session.uid;
            data.uname = req.session.uname;
            data.isAdmin = req.session.isAdmin;
            res.render("notice", { data: data, notice: notice[0] });
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});

// 공지글 페이지 접속
router.get("/:no", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
            // DB에서 해당 글 데이터 불러오기
            const target_notice = await pool.query(
                "SELECT * FROM notice WHERE no = ?;",
                [req.params.no]
            );
            // DB에서 이전 글 데이터 불러오기
            const pre_notice = await pool.query(
                "SELECT * FROM notice WHERE no = ?;",
                [parseInt(req.params.no) - 1]
            );
            // DB에서 다음 글 데이터 불러오기
            const next_notice = await pool.query(
                "SELECT * FROM notice WHERE no = ?;",
                [parseInt(req.params.no) + 1]
            );
            // 배열에 이전, 해당, 다음 글을 담아 사용
            const notice_list = [
                pre_notice[0][0],
                target_notice[0][0],
                next_notice[0][0],
            ];
            // 조회수 증가
            const view = await pool.query(
                "UPDATE notice SET view = ? WHERE no = ?;",
                [target_notice[0][0].view + 1, req.params.no]
            );
            data.uid = req.session.uid;
            data.uname = req.session.uname;
            data.isAdmin = req.session.isAdmin;
            res.render("notice-detail", { data: data, notice: notice_list });
        } catch (error) {
            console.log(error);
            res.redirect("/error");
        }
    }
});

module.exports = router;
