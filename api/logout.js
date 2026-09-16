"use strict";

const auth = require("./_lib/auth");
const { json, rotear } = require("./_lib/http");

module.exports = async function (req, res) {
  return rotear(req, res, {
    POST: async () => {
      res.setHeader("Set-Cookie", auth.cookieVazio());
      return json(res, 200, { encerrada: true });
    }
  });
};
