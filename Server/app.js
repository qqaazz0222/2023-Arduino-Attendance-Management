var createError = require("http-errors");
var express = require("express");
var cors = require("cors");
var favicon = require("serve-favicon");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var mainRouter = require("./routes/main");
var signRouter = require("./routes/sign");
var checkRouter = require("./routes/check");
var absenceRouter = require("./routes/absence");
var noticeRouter = require("./routes/notice");
var adminRouter = require("./routes/admin");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());
app.use(favicon(path.join(__dirname, "public/images", "favicon.ico")));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
    "/tinymce",
    express.static(path.join(__dirname, "node_modules", "tinymce"))
);

app.use("/", mainRouter);
app.use("/sign", signRouter);
app.use("/check", checkRouter);
app.use("/absence", absenceRouter);
app.use("/notice", noticeRouter);
app.use("/admin", adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

module.exports = app;
