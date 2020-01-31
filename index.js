var express = require("express");
var ejs = require("ejs");
var client = require("cheerio-httpcli");
var app = express();
app.engine("ejs", ejs.renderFile);
app.use(express.static("public"));
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  var msg =
    "学籍番号と生徒用マイページのパスワードを入力すると<br>レポートの進捗率が分かります！<br><p>リクエストを送る際に都度パスワードが必要です</p>";
  res.render("index.ejs", {
    title: "ARPC",
    content: msg
  });
});
var month1;
// ※POST送信の処理
app.post("/", (req, res) => {
  month1 = req.body["month"];
  console.log(req.body.id + ":" + req.body.pw);
  getReport(req.body.id, req.body.pw)
    .then(function(value) {
      res.render("index.ejs", {
        title: "Result",
        content: value
      });
    })
    .catch(function(error) {
      // 非同期処理失敗。
      res.render("index.ejs", {
        title: "evi",
        content: "エラーが起きました<br>" + error
      });
    });
});
var server = app.listen(19132, () => {
  console.log("Server is running!");
});
function getReport(id, pw) {
  return new Promise(function(resolve, reject) {
    client
      .fetch("https://secure.nnn.ed.jp/mypage/")
      .then(result => {
        return result.$("#index").submit({
          loginId: id,
          password: pw
        });
      })
      .then(() => {
        return client.fetch(
          "https://secure.nnn.ed.jp/mypage/reauth_login/index?url=%2Fresult%2Fhome%2Findex"
        );
      })
      .then(result => {
        return result.$("#reauth_login_index").submit({
          password: pw
        });
      })
      .then(result => {
        resolve(judge(result));
      })
      .catch(function(err) {
        reject(err + "test");
      });
  });
}
function getReportNum(result) {
  return result.$(".header_report_number").length;
}
function getReportLimitDate(result) {
  let reportLimitDates = [];
  for (let index = 0; index < result.$(".report_limit_date").length; index++) {
    let n = result
      .$(".report_limit_date")
      .eq(index)
      .text()
      .match(/\d{1,2}\/\d{1,2}/);
    if (n == null) {
      reportLimitDates.push("-1");
    } else {
      reportLimitDates.push(n[0]);
    }
  }
  return reportLimitDates;
}
function getProgress(result) {
  let progress = [];
  for (let index = 0; index < result.$(".report_progress").length; index++) {
    if (index % 30 < 15) {
      let n = result
        .$(".report_progress")
        .eq(index)
        .text()
        .match(/\d{1,3}%/);
      if (n == null) {
        progress.push(-1);
      } else {
        progress.push(Number(n[0].substring(0, n[0].length - 1)));
      }
    }
  }
  return progress;
}
function getSubject(result) {
  let progress = [];
  for (let index = 0; index < result.$(".subject_1st_row").length; index++) {
    progress.push(
      result
        .$(".subject_1st_row > td:first-child")
        .eq(index)
        .text()
    );
  }
  return progress;
}

function judge(result) {
  let reportNum = getReportNum(result);
  let reportLimitDate = getReportLimitDate(result);
  let progress = getProgress(result);
  let subject = getSubject(result);
  let gSum = 0;
  let receive = "";
  let quantity = 0;
  let rest = 0;
  if (month1 == "all") {
    for (let month = 6; month < 13; month++) {
      //6月から12月までのループ
      for (let i = 0; i < subject.length; i++) {
        let sum = 0;
        let count = 0;
        let test = false;
        for (let index = 0; index < reportNum; index++) {
          if (reportLimitDate[index + i * reportNum].indexOf("/") != -1) {
            let rMonth = reportLimitDate[index + i * reportNum].split("/")[0];
            if (rMonth == month) {
              count++;
              test = true;
              sum += progress[index + i * reportNum];
            }
          }
        }
        if (test) {
          receive +=
            month + "月分 : " + subject[i] + " : " + sum / count + "%" + "\n";
          gSum += sum;
        }
        quantity += count;
        if (sum / count > 100) {
          rest++;
        }
      }
    }
  } else {
    for (let i = 0; i < subject.length; i++) {
      let sum = 0;
      let count = 0;
      let test = false;
      for (let index = 0; index < reportNum; index++) {
        if (reportLimitDate[index + i * reportNum].indexOf("/") != -1) {
          let rMonth = reportLimitDate[index + i * reportNum].split("/")[0];
          if (rMonth == month1) {
            count++;
            test = true;
            sum += progress[index + i * reportNum];
          }
        }
      }
      if (test) {
        receive += subject[i] + " : " + sum / count + "%" + "\n";
        gSum += sum;
      }
      quantity += count;
      if (sum / count > 100) {
        rest++;
      }
    }
  }
  if (receive == "") {
  } else {
    return (
      "進捗度：" +
      gSum / quantity +
      "%<br>残り教科数：" +
      rest +
      "<br></pre><pre>" +
      receive
    );
  }
}
