/* 图鉴系列 · 通用测试引擎（蜡笔绘本风）
   页面里定义 window.QUIZ 后引入本文件。
   计分：每个选项给若干「结果 key」加分，总分最高者为结果。
   答题支持 上一题 / 下一题。 */
(function () {
  var Q = window.QUIZ;
  if (!Q) { console.warn("缺少 window.QUIZ"); return; }

  var $ = function (id) { return document.getElementById(id); };
  function txt(id, v) { var e = $(id); if (e) e.textContent = v; }
  function html(id, v) { var e = $(id); if (e) e.innerHTML = v; }

  var LETTERS = "ABCDEFG";
  var idx = 0, answers = [], scores = {};

  function init() {
    if (Q.title) document.title = Q.title;
    txt("kicker", Q.kicker || "");
    txt("title", Q.title || "");
    html("intro", Q.intro || "");
    html("startNote", Q.startNote || "");
    html("disclaimer", Q.disclaimer || "");
    txt("startLabel", Q.startLabel || "开始测试");
    txt("qTotal", Q.questions.length);
    txt("qUnit", (Q.meta && Q.meta.unit) || "题");
    if (Q.results) Object.keys(Q.results).forEach(function (k) { scores[k] = 0; });
    bind("start", begin);
    bind("again", function () { to("s-start"); });
    bind("prevBtn", function () { go(-1); });
    bind("nextBtn", function () { go(1); });
    demo();
  }

  function bind(id, fn) { var e = $(id); if (e) e.onclick = fn; }

  function to(id) {
    ["s-start", "s-quiz", "s-result"].forEach(function (s) {
      var e = $(s); if (e) e.classList.toggle("hidden", s !== id);
    });
    window.scrollTo(0, 0);
  }

  // 直达结果：xxx.html#demo=key —— 供出图/预览
  function demo() {
    var m = /(?:^|[#&])demo=([A-Za-z0-9_]+)/.exec(location.hash);
    if (!m || !Q.results[m[1]]) return;
    var key = m[1], spare = [17, 13, 9, 6], i = 0;
    Object.keys(scores).forEach(function (k) { scores[k] = (k === key) ? 24 : (spare[i++] || 5); });
    showResult();
  }

  function begin() {
    idx = 0; answers = [];
    Object.keys(scores).forEach(function (k) { scores[k] = 0; });
    to("s-quiz"); renderQ();
  }

  function renderQ() {
    var q = Q.questions[idx], n = Q.questions.length;
    txt("pnum", (idx + 1) + " / " + n);
    $("pfill").style.width = ((idx + 1) / n * 100) + "%";
    txt("qtag", q.tag || "第 " + (idx + 1) + " 题");
    txt("qtext", q.text);

    var box = $("opts"); box.innerHTML = "";
    q.opts.forEach(function (o, i) {
      var b = document.createElement("button");
      b.className = "opt" + (answers[idx] === i ? " on" : "");
      var k = document.createElement("span"); k.className = "k"; k.textContent = LETTERS[i];
      var t = document.createElement("span"); t.textContent = o.label;
      b.appendChild(k); b.appendChild(t);
      b.onclick = function () { answers[idx] = i; go(1); };
      box.appendChild(b);
    });

    var prev = $("prevBtn"), next = $("nextBtn");
    if (prev) prev.disabled = idx === 0;
    if (next) {
      var last = idx === n - 1;
      next.querySelector(".lbl").textContent = last ? "查看结果" : "下一题";
      next.disabled = answers[idx] === undefined;
    }
    var card = $("s-quiz").querySelector(".card");
    card.classList.remove("reveal"); void card.offsetWidth; card.classList.add("reveal");
  }

  function go(d) {
    var n = Q.questions.length;
    if (d > 0 && idx === n - 1) { finish(); return; }
    if (d > 0 && answers[idx] === undefined) return;
    idx = Math.min(n - 1, Math.max(0, idx + d));
    renderQ();
  }

  function finish() {
    Object.keys(scores).forEach(function (k) { scores[k] = 0; });
    answers.forEach(function (ai, qi) {
      var add = Q.questions[qi].opts[ai] && Q.questions[qi].opts[ai].scores;
      if (add) Object.keys(add).forEach(function (k) { scores[k] = (scores[k] || 0) + add[k]; });
    });
    showResult();
  }

  function top() {
    var best = null, bestV = -1;
    Object.keys(scores).forEach(function (k) { if (scores[k] > bestV) { bestV = scores[k]; best = k; } });
    return best;
  }

  function showResult() {
    var key = top(), r = Q.results[key];
    txt("plate", r.glyph || "✦");
    txt("rcode", r.code || "");
    txt("rname", r.name || "");
    txt("rtag", r.tag || "");
    txt("portrait", r.portrait || "");

    var d = $("rdetail"); d.innerHTML = "";
    (r.detail || []).forEach(function (sec) {
      var h = document.createElement("h3"); h.textContent = sec[0]; d.appendChild(h);
      if (typeof sec[1] === "string") {
        var p = document.createElement("p"); p.textContent = sec[1]; d.appendChild(p);
      } else {
        var ul = document.createElement("ul");
        sec[1].forEach(function (it) { var li = document.createElement("li"); li.textContent = it; ul.appendChild(li); });
        d.appendChild(ul);
      }
    });

    var mBox = $("rmatch"); mBox.innerHTML = "";
    if (r.match) {
      var labels = Q.matchLabels || { good: "最合拍", bad: "最容易出事" };
      var t = document.createElement("div"); t.className = "match-title"; t.textContent = Q.matchTitle || "配对图鉴";
      mBox.appendChild(t);
      if (r.match.best) mBox.appendChild(row("good", labels.good, r.match.best));
      if (r.match.worst) mBox.appendChild(row("bad", labels.bad, r.match.worst));
    } else { mBox.classList.add("hidden"); }

    var qBox = $("rquote");
    if (r.quote) { qBox.textContent = "“" + r.quote + "”"; qBox.classList.remove("hidden"); }
    else qBox.classList.add("hidden");

    // 得分条
    var box = $("rbars"); box.innerHTML = "";
    var max = 1; Object.keys(scores).forEach(function (k) { if (scores[k] > max) max = scores[k]; });
    Object.keys(Q.results).map(function (k) { return [k, scores[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .forEach(function (pair) {
        var k = pair[0], v = pair[1];
        var rw = document.createElement("div");
        rw.className = "bar-row" + (k === key ? " on" : "");
        var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = Q.results[k].name;
        var tr = document.createElement("span"); tr.className = "track";
        var fl = document.createElement("i"); fl.className = "fill"; fl.style.width = "0%"; tr.appendChild(fl);
        var sc = document.createElement("span"); sc.className = "sc"; sc.textContent = v + (Q.scoreUnit || "");
        rw.appendChild(nm); rw.appendChild(tr); rw.appendChild(sc); box.appendChild(rw);
        requestAnimationFrame(function () { fl.style.width = Math.max(5, Math.round(v / max * 100)) + "%"; });
      });

    // CTA
    var c = $("rcta");
    if (Q.cta) {
      var h = '<span class="eyebrow">' + Q.cta.eyebrow + '</span>';
      h += '<h4>' + Q.cta.title + '</h4>';
      h += '<p class="lead">' + Q.cta.lead + '</p>';
      if (Q.cta.items && Q.cta.items.length) {
        h += "<ul>" + Q.cta.items.map(function (it) { return "<li>" + it + "</li>"; }).join("") + "</ul>";
      }
      if (Q.cta.foot) h += '<p class="foot">' + Q.cta.foot + "</p>";
      c.innerHTML = h; c.classList.remove("hidden");
    } else c.classList.add("hidden");

    to("s-result");
    var card = $("s-result").querySelector(".card");
    card.classList.remove("reveal"); void card.offsetWidth; card.classList.add("reveal");
  }

  function row(cls, tag, text) {
    var rw = document.createElement("div"); rw.className = "match-row";
    var t = document.createElement("span"); t.className = "tag " + cls; t.textContent = tag;
    var x = document.createElement("span"); x.className = "txt"; x.textContent = text;
    rw.appendChild(t); rw.appendChild(x);
    return rw;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
