const fs = require("fs");

const json = fs.readFileSync("./db/options.json", "utf8");
const options = JSON.parse(json);

const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const sessionStore = new MySQLStore(options);
module.exports = sessionStore;
