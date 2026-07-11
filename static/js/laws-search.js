(function () {
  "use strict";

  var input = document.getElementById("laws-search-input");
  var resultsBox = document.getElementById("laws-search-results");
  var countBadge = document.getElementById("laws-search-count");
  var INDEX_URL = "/laws/index.json";
  var index = null;
  var indexPromise = null;

  // --- نرمال‌سازی حروف عربی/فارسی برای جستجوی دقیق‌تر ---
  function normalize(str) {
    return (str || "")
      .replace(/[\u064A]/g, "ی")   // ي عربی -> ی فارسی
      .replace(/[\u0643]/g, "ک")   // ك عربی -> ک فارسی
      .replace(/[\u200c\u200f\u064B-\u065F]/g, "") // نیم‌فاصله و اعراب
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .toLowerCase()
      .trim();
  }

  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch(INDEX_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("search index not available");
        return r.json();
      })
      .then(function (data) {
        index = data.map(function (item) {
          return Object.assign({}, item, { _norm: normalize(item.text) });
        });
        return index;
      })
      .catch(function (err) {
        console.error("خطا در بارگذاری ایندکس جستجو:", err);
        index = [];
        return index;
      });
    return indexPromise;
  }

  function highlight(text, term) {
    if (!term) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var re = new RegExp("(" + escapedTerm + ")", "gi");
    return escaped.replace(re, "<mark>$1</mark>");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function snippet(text, normText, normTerm, radius) {
    var pos = normText.indexOf(normTerm);
    if (pos === -1) return text.slice(0, radius * 2) + "…";
    var start = Math.max(0, pos - radius);
    var end = Math.min(text.length, pos + normTerm.length + radius);
    var prefix = start > 0 ? "…" : "";
    var suffix = end < text.length ? "…" : "";
    return prefix + text.slice(start, end) + suffix;
  }

  function render(term) {
    if (!term) {
      resultsBox.classList.remove("open");
      resultsBox.innerHTML = "";
      countBadge.textContent = "۰ نتیجه";
      return;
    }

    var normTerm = normalize(term);
    var matches = index.filter(function (item) {
      return item._norm.indexOf(normTerm) !== -1;
    }).slice(0, 40);

    countBadge.textContent = toPersianDigits(matches.length) + " نتیجه";

    if (matches.length === 0) {
      resultsBox.innerHTML = '<div class="laws-empty">نتیجه‌ای برای «' + escapeHtml(term) + '» پیدا نشد.</div>';
      resultsBox.classList.add("open");
      return;
    }

    var html = matches.map(function (item) {
      var snip = snippet(item.text, item._norm, normTerm, 60);
      return (
        '<a class="laws-result" href="' + item.url + '">' +
          '<div class="laws-result-law">' + escapeHtml(item.law_title) + '</div>' +
          '<div class="laws-result-madeh">ماده ' + toPersianDigits(item.number) + '</div>' +
          '<div class="laws-result-snippet">' + highlight(snip, term) + '</div>' +
        '</a>'
      );
    }).join("");

    resultsBox.innerHTML = html;
    resultsBox.classList.add("open");
  }

  function toPersianDigits(n) {
    var map = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];
    return String(n).replace(/[0-9]/g, function (d) { return map[d]; });
  }

  var debounceTimer;
  function onInput() {
    clearTimeout(debounceTimer);
    var term = input.value.trim();
    debounceTimer = setTimeout(function () {
      loadIndex().then(function () { render(term); });
    }, 120);
  }

  if (input) {
    input.addEventListener("input", onInput);
    input.addEventListener("focus", function () { loadIndex(); });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".laws-search-wrap")) {
        resultsBox.classList.remove("open");
      }
    });
  }

  // --- هایلایت و اسکرول به مادهٔ مقصد در صفحه تک‌قانون (وقتی از نتایج جستجو می‌آید) ---
  document.addEventListener("DOMContentLoaded", function () {
    if (location.hash && location.hash.indexOf("#madeh-") === 0) {
      var target = document.querySelector(location.hash);
      if (target) {
        target.classList.add("pulse");
        setTimeout(function () { target.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50);
      }
    }
  });

  function normalizePublic(str) { return normalize(str); }
  window.LawsNormalize = normalizePublic;
})();

/* ===================================================================
   فیلتر عنوان قوانین در صفحهٔ فهرست (کنار جعبه جستجو)
   =================================================================== */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var filterInput = document.getElementById("laws-filter-input");
    var list = document.getElementById("laws-index-list");
    var emptyMsg = document.getElementById("laws-empty-filter");
    var countLabel = document.getElementById("laws-filter-count");
    if (!filterInput || !list) return;

    var items = Array.prototype.slice.call(list.querySelectorAll(".laws-index-item")).map(function (el) {
      var titleEl = el.querySelector(".li-title");
      var original = el.getAttribute("data-title") || titleEl.textContent;
      return {
        el: el,
        titleEl: titleEl,
        original: original,
        norm: window.LawsNormalize ? window.LawsNormalize(original) : original.toLowerCase()
      };
    });
    var total = items.length;

    function escapeHtml(str) {
      var div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function highlightLocal(text, term) {
      var escaped = escapeHtml(text);
      if (!term) return escaped;
      var escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("(" + escapedTerm + ")", "gi");
      return escaped.replace(re, "<mark>$1</mark>");
    }

    var debounce;
    filterInput.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        var raw = filterInput.value.trim();
        var norm = window.LawsNormalize ? window.LawsNormalize(raw) : raw.toLowerCase();
        var visible = 0;

        items.forEach(function (item) {
          if (!norm) {
            item.el.classList.remove("filtered-out");
            item.titleEl.innerHTML = escapeHtml(item.original);
            visible++;
            return;
          }
          var match = item.norm.indexOf(norm) !== -1;
          item.el.classList.toggle("filtered-out", !match);
          if (match) {
            item.titleEl.innerHTML = highlightLocal(item.original, raw);
            visible++;
          }
        });

        if (countLabel) {
          countLabel.textContent = norm
            ? visible + " از " + total + " قانون نمایش داده می‌شود"
            : "همه قوانین نمایش داده می‌شوند";
        }
        if (emptyMsg) emptyMsg.hidden = visible !== 0;
      }, 80);
    });
  });
})();
(function () {
  "use strict";

  var STORAGE_KEY = "laws-prefs-v1";
  var FONT_STEPS = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4];
  var DEFAULT_STEP = 3; // index of 1.0

  function loadPrefs() {
    try {
      return Object.assign(
        { theme: "light", font: "vazir", fontStep: DEFAULT_STEP },
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      );
    } catch (e) {
      return { theme: "light", font: "vazir", fontStep: DEFAULT_STEP };
    }
  }

  function savePrefs(prefs) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  var prefs = loadPrefs();

  function applyPrefs(scope) {
    if (!scope) return;
    scope.setAttribute("data-theme", prefs.theme);
    scope.setAttribute("data-font", prefs.font);
    scope.style.setProperty("--font-scale", FONT_STEPS[prefs.fontStep]);

    var icon = document.getElementById("theme-icon");
    if (icon) icon.textContent = prefs.theme === "dark" ? "☀" : "☾";

    document.querySelectorAll("[data-font-btn]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-font-btn") === prefs.font);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var scope = document.getElementById("laws-scope-root") || document.querySelector(".laws-scope");
    applyPrefs(scope);
    if (!scope) return;

    // --- تغییر حالت شب/روز ---
    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        prefs.theme = prefs.theme === "dark" ? "light" : "dark";
        savePrefs(prefs);
        applyPrefs(scope);
      });
    }

    // --- تغییر خانوادهٔ فونت ---
    document.querySelectorAll("[data-font-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        prefs.font = btn.getAttribute("data-font-btn");
        savePrefs(prefs);
        applyPrefs(scope);
      });
    });

    // --- اندازهٔ فونت ---
    var incBtn = document.getElementById("font-size-inc");
    var decBtn = document.getElementById("font-size-dec");
    var resetBtn = document.getElementById("font-size-reset");
    if (incBtn) incBtn.addEventListener("click", function () {
      prefs.fontStep = Math.min(FONT_STEPS.length - 1, prefs.fontStep + 1);
      savePrefs(prefs); applyPrefs(scope);
    });
    if (decBtn) decBtn.addEventListener("click", function () {
      prefs.fontStep = Math.max(0, prefs.fontStep - 1);
      savePrefs(prefs); applyPrefs(scope);
    });
    if (resetBtn) resetBtn.addEventListener("click", function () {
      prefs.fontStep = DEFAULT_STEP;
      savePrefs(prefs); applyPrefs(scope);
    });

    // --- فیلتر مواد همین صفحه ---
    var filterInput = document.getElementById("madeh-filter-input");
    var filterCount = document.getElementById("madeh-filter-count");
    var list = document.getElementById("madeh-list");
    if (!filterInput || !list) return;

    var items = Array.prototype.slice.call(list.querySelectorAll(".madeh")).map(function (el) {
      var textEl = el.querySelector(".madeh-text");
      return {
        el: el,
        textEl: textEl,
        original: textEl ? textEl.textContent : "",
        norm: (window.LawsNormalize ? window.LawsNormalize(textEl.textContent) : textEl.textContent.toLowerCase())
      };
    });
    var total = items.length;

    function escapeHtml(str) {
      var div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function highlightLocal(text, term) {
      var escaped = escapeHtml(text);
      if (!term) return escaped;
      var escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("(" + escapedTerm + ")", "gi");
      return escaped.replace(re, "<mark>$1</mark>");
    }

    var debounce;
    filterInput.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        var raw = filterInput.value.trim();
        var norm = window.LawsNormalize ? window.LawsNormalize(raw) : raw.toLowerCase();
        var visible = 0;

        items.forEach(function (item) {
          if (!norm) {
            item.el.classList.remove("filtered-out");
            item.textEl.innerHTML = escapeHtml(item.original);
            visible++;
            return;
          }
          var match = item.norm.indexOf(norm) !== -1;
          item.el.classList.toggle("filtered-out", !match);
          if (match) {
            item.textEl.innerHTML = highlightLocal(item.original, raw);
            visible++;
          }
        });

        filterCount.textContent = norm ? (visible + " از " + total + " ماده") : "";
      }, 90);
    });
  });
})();
