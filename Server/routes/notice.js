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

router.get("/", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
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

router.get("/:no", async (req, res, next) => {
    if (req.session.isLogined == undefined) {
        res.redirect("/sign");
    } else {
        try {
            const target_notice = await pool.query(
                "SELECT * FROM notice WHERE no = ?;",
                [req.params.no]
            );
            const pre_notice = await pool.query(
                "SELECT * FROM notice WHERE no = ?;",
                [parseInt(req.params.no) - 1]
            );
            const next_notice = await pool.query(
                "SELECT * FROM notice WHERE no = ?;",
                [parseInt(req.params.no) + 1]
            );
            const notice_list = [
                pre_notice[0][0],
                target_notice[0][0],
                next_notice[0][0],
            ];
            const view = await pool.query(
                "UPDATE notice SET view = ? WHERE no = ?;",
                [target_notice[0][0].view + 1, req.params.no]
            );
            console.log(notice_list[2]);
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
