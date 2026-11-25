// 啟動器：檢查 WebGL 後載入 2.5D 引擎（ES module）。保持為一般 script，方便 CI 以 node --check 檢查。
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  function fail(msg) {
    var box = $("#boot-error");
    box.hidden = false;
    box.textContent = msg;
  }
  var probe = document.createElement("canvas");
  var gl = probe.getContext("webgl2") || probe.getContext("webgl");
  if (!gl) {
    fail("你的瀏覽器或裝置目前無法使用 WebGL，因此無法顯示 3D 場景。請改用最新版 Chrome、Edge、Safari 或 Firefox，並確認已開啟硬體加速。");
    return;
  }
  import("./js/main.js")
    .then(function (m) { return m.boot(); })
    .catch(function (e) {
      console.error(e);
      fail("遊戲載入失敗：" + (e && e.message ? e.message : e) + "。請重新整理頁面再試一次。");
    });
})();
