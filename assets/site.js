(function () {
  // Safe lookup: pages without a given element (e.g. no waitlist form) just skip it.
  function T(id) { return document.getElementById(id) || { style: {}, addEventListener: function () {} }; }
  // ─── WAITLIST COUNTER ────────────────────────────────────────────────────────
  // Both the live count AND the cohort size come from the API
  // (GET /api/waitlist/count → { count, total }). The cohort size is set on the
  // server via the WAITLIST_TOTAL_SPOTS env var — no page edit needed to change it.
  // The constants below are only fallbacks if that request fails.
  const FALLBACK_COUNT = 9;
  var   TOTAL_SPOTS    = 25;
  var   lastCount      = FALLBACK_COUNT;
  // ─────────────────────────────────────────────────────────────────────────────

  function renderSpotCounter(count) {
    const c      = (typeof count === 'number') ? count : lastCount;
    lastCount    = c;
    const remain = Math.max(TOTAL_SPOTS - c, 0);
    const pct    = Math.min((c / TOTAL_SPOTS) * 100, 100);

    var el = T('spotCounter');
    if (!el) return;

    T('joinedCount').textContent        = c;
    T('joinedCountBottom').textContent  = c;
    T('totalCount').textContent         = TOTAL_SPOTS;
    T('spotsRemainingLabel').textContent = remain;
    T('spotRemaining').textContent      = remain + ' spots left';
    T('spotBarFill').style.width        = pct + '%';
  }

  // Pull the real signup count from the database via the API. Falls back to the
  // static number only if the request fails (offline / API down).
  function loadSpotCount() {
    fetch('https://app.testovex.com/api/waitlist/count')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && typeof d.total === 'number' && d.total > 0) TOTAL_SPOTS = d.total;
        renderSpotCounter(d && typeof d.count === 'number' ? d.count : undefined);
      })
      .catch(function () { renderSpotCounter(); });
  }

  // Render immediately with the fallback, then refresh with the live count.
  renderSpotCounter();
  loadSpotCount();

  const WL_KEY = 'testovex_waitlist';

  // Hide the form and, when it sits in a .form-wrap, its label and small print too,
  // so the confirmation message takes the form's place.
  function hideForm(formId) {
    var f = T(formId);
    f.style.display = 'none';
    var wrap = f.closest ? f.closest('.form-wrap') : null;
    if (wrap) wrap.style.display = 'none';
  }

  function showSuccess(formId, successId) {
    hideForm(formId);
    T(successId).style.display = 'flex';
  }

  function showDuplicate() {
    hideForm('waitlistForm');
    T('alreadyMsg').style.display = 'flex';
    T('successMsg').style.display = 'none';
  }

  // On page load: if already submitted, show success
  (function() {
    if (localStorage.getItem(WL_KEY)) {
      showSuccess('waitlistForm', 'successMsg');
      showSuccess('ctaForm', 'ctaSuccess');
    }
  })();

  function submitEmail(email, formId, successId) {
    const stored = localStorage.getItem(WL_KEY);
    if (stored && stored === email) {
      showDuplicate(); return;
    }
    fetch('https://app.testovex.com/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(function(res) {
      if (res.status === 409) {
        // already on waitlist
        showDuplicate(); return;
      }
      localStorage.setItem(WL_KEY, email);
      showSuccess(formId, successId);
      if (formId === 'waitlistForm') showSuccess('ctaForm', 'ctaSuccess');
      if (formId === 'ctaForm') showSuccess('waitlistForm', 'successMsg');
      loadSpotCount();
    }).catch(function() {
      // network error — still show success so user isn't frustrated
      localStorage.setItem(WL_KEY, email);
      showSuccess(formId, successId);
      renderSpotCounter(lastCount + 1);
    });
  }

  T('waitlistForm').addEventListener('submit', function(e) {
    e.preventDefault();
    submitEmail(T('emailInput').value.trim().toLowerCase(), 'waitlistForm', 'successMsg');
  });

  T('ctaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    submitEmail(T('ctaEmailInput').value.trim().toLowerCase(), 'ctaForm', 'ctaSuccess');
  });

  
/* ── Feature section: scroll-triggered fade-ins ── */
  (function() {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (en.isIntersecting) { en.target.classList.add('vis'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.lp-fade').forEach(function(el) { obs.observe(el); });
  })();

  /* ── Analytics chart bars ── */
  (function() {
    var chartEl = document.getElementById('lp-chart');
    if (!chartEl) return;
    var weeks = [
      { p: 82, f: 8, lbl: 'W1' }, { p: 87, f: 6, lbl: 'W2' }, { p: 85, f: 9, lbl: 'W3' },
      { p: 90, f: 5, lbl: 'W4' }, { p: 91, f: 4, lbl: 'W5' }, { p: 93, f: 4, lbl: 'W6' },
      { p: 94, f: 3, lbl: 'W7' }, { p: 94, f: 3, lbl: 'W8' }
    ];
    var maxH = 85;
    var html = '';
    weeks.forEach(function(w) {
      var ph = Math.round((w.p / 100) * maxH);
      var fh = Math.round((w.f / 100) * maxH);
      html += '<div class="lp-bg">'
        + '<div class="lp-bp" style="height:' + ph + 'px"></div>'
        + '<div class="lp-bf" style="height:' + fh + 'px"></div>'
        + '<div class="lp-bl">' + w.lbl + '</div>'
        + '</div>';
    });
    chartEl.innerHTML = html;
  })();

  /* ── Pricing: billing-period selector (monthly / 6-month / annual) ── */
  (function () {
    var seg = document.getElementById('prSeg');
    if (!seg) return;
    var btns = seg.querySelectorAll('.pr-seg-btn');
    function apply(period) {
      btns.forEach(function (b) {
        var on = b.getAttribute('data-period') === period;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.pr-amt').forEach(function (el) {
        var v = el.getAttribute('data-' + period);
        if (v) el.textContent = v;
      });
      document.querySelectorAll('.pr-billed').forEach(function (el) {
        // Only the tiered cards carry data-m; Enterprise ("Tailored…") is left alone.
        if (el.hasAttribute('data-m')) {
          el.textContent = el.getAttribute('data-' + period) || '';
        }
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-period')); });
    });
  })();

  /* ── ROI calculator ── */
  (function () {
    var team    = document.getElementById('roiTeam');
    if (!team) return;
    var cost    = document.getElementById('roiCost');
    var reclaim = document.getElementById('roiReclaim');
    var plan    = document.getElementById('roiPlan');
    if (!team || !cost || !reclaim || !plan) return;

    function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

    function recompute() {
      var t = Math.max(1, parseInt(team.value, 10) || 1);
      var c = Math.max(0, parseFloat(cost.value) || 0);
      var r = (parseInt(reclaim.value, 10) || 0) / 100;
      var p = parseFloat(plan.value) || 0;

      var teamCost      = t * c;
      var reclaimedMo   = teamCost * r;
      var engineers     = t * r;
      var netMo         = reclaimedMo - p;
      var multiple      = p > 0 ? reclaimedMo / p : 0;

      // Yearly tool cost uses the annual price (2 months free), matching pricing.
      var toolYr        = p * 10;

      // Live input labels
      document.getElementById('roiTeamVal').textContent    = t;
      document.getElementById('roiCostVal').textContent    = money(c);
      document.getElementById('roiReclaimVal').textContent = Math.round(r * 100) + '%';

      // Hero + minis
      document.getElementById('roiNetMonthly').textContent  = money(netMo);
      document.getElementById('roiMultiple').textContent    = '≈ ' + (multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)) + '× return on tool cost';
      document.getElementById('roiReclaimedVal').textContent = money(reclaimedMo);
      document.getElementById('roiEngineers').textContent   = engineers.toFixed(1);
      document.getElementById('roiToolCost').textContent    = money(p);

      // Horizon table
      document.getElementById('roiMoReclaim').textContent   = money(reclaimedMo);
      document.getElementById('roiMoNet').textContent       = money(netMo);
      document.getElementById('roiHalfReclaim').textContent = money(reclaimedMo * 6);
      document.getElementById('roiHalfNet').textContent     = money(reclaimedMo * 6 - p * 6);
      document.getElementById('roiYrReclaim').textContent   = money(reclaimedMo * 12);
      document.getElementById('roiYrNet').textContent       = money(reclaimedMo * 12 - toolYr);
    }

    [team, cost, reclaim, plan].forEach(function (el) {
      el.addEventListener('input', recompute);
      el.addEventListener('change', recompute);
    });
    recompute();
  })();


})();

(function () {
  // ── hero: live run animation ──
  var steps = [
    ['UI','navigate <code>/login</code>',120],
    ['UI','fill <code>email</code> with {{user_email}}',86],
    ['UI','click <code>Sign in</code>',214],
    ['API','GET <code>/api/orders</code> as the same user',142],
    ['API','assert <code>$.items[0].status</code> = "paid"',9],
    ['UI','assert <code>Order confirmed</code> is visible',71],
    ['UI','screenshot <code>after-checkout</code>',48]
  ];
  var card = document.getElementById('lrCard'), list = document.getElementById('lrSteps');
  if (card && list) {
    var chip = document.getElementById('lrChip'), prog = document.getElementById('lrProg'), sum = document.getElementById('lrSum');
    var total = steps.reduce(function (a, s) { return a + s[2]; }, 0);
    steps.forEach(function (st) {
      var li = document.createElement('li'); li.className = 'lr-step';
      li.innerHTML = '<span class="lr-ico"></span><span class="lr-kind ' + st[0].toLowerCase() + '">' + st[0] + '</span><span class="lr-txt">' + st[1] + '</span><span class="lr-ms">' + st[2] + ' ms</span>';
      list.appendChild(li);
    });
    var items = list.children, timers = [], visible = false, running = false;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function reset() { timers.forEach(clearTimeout); timers = []; card.classList.remove('done'); chip.textContent = 'Running'; prog.style.width = '0'; sum.textContent = 'Running step by step'; for (var i = 0; i < items.length; i++) items[i].className = 'lr-step'; }
    function finish() { card.classList.add('done'); chip.textContent = 'Passed'; prog.style.width = '100%'; sum.textContent = steps.length + ' passed · 0 failed · ' + (total / 1000).toFixed(1) + ' s'; for (var i = 0; i < items.length; i++) items[i].className = 'lr-step done'; }
    function play() {
      if (running) return; running = true; reset();
      var t = 500;
      steps.forEach(function (st, i) {
        later(function () { items[i].className = 'lr-step running'; prog.style.width = ((i + 0.5) / steps.length * 100) + '%'; }, t);
        t += 650;
        later(function () { items[i].className = 'lr-step done'; prog.style.width = ((i + 1) / steps.length * 100) + '%'; }, t);
      });
      later(function () { card.classList.add('done'); chip.textContent = 'Passed'; sum.textContent = steps.length + ' passed · 0 failed · ' + (total / 1000).toFixed(1) + ' s'; }, t + 100);
      later(function () { running = false; if (visible) play(); }, t + 4200);
    }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { finish(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) play(); else { running = false; reset(); } }, { threshold: 0.25 }).observe(card);
    } else { finish(); }
  }

  // ── org dashboard demo tabs ──
  var tabs = document.querySelectorAll('.od-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
      document.querySelectorAll('.od-panel').forEach(function (p) { p.classList.remove('active'); });
      var panel = document.getElementById('od-' + tab.getAttribute('data-od'));
      if (panel) { void panel.offsetWidth; panel.classList.add('active'); }
    });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var arr = Array.prototype.slice.call(tabs), i = arr.indexOf(tab);
      var nxt = arr[(i + (e.key === 'ArrowRight' ? 1 : arr.length - 1)) % arr.length]; nxt.focus(); nxt.click();
    });
  });
})();
(function () {
  var hero = document.getElementById('emailInput'), tail = document.getElementById('ctaEmailInput');
  document.querySelectorAll('a.nav-cta, .lp-m-actions a.nav-btn').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = (window.scrollY < 1400 && hero) ? hero : tail;
      if (!target) return;
      e.preventDefault();
      var box = target.closest('form') || target;
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { try { target.focus({ preventScroll: true }); } catch (x) { target.focus(); } }, 450);
    });
  });
})();

/* ── Menu: mobile panel, dropdowns, scrolled state ── */
(function () {
  var nav = document.querySelector('nav');
  var burger = document.getElementById('navBurger');
  var panel = document.getElementById('lpMobile');
  function setOpen(open) {
    if (!burger || !panel) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
  }
  if (burger) burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
  if (panel) panel.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setOpen(false); if (nav && document.activeElement && document.activeElement.blur && nav.contains(document.activeElement)) document.activeElement.blur(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 960) setOpen(false); });

  // desktop dropdowns: close after a click, reopen on the next hover or keyboard focus
  document.querySelectorAll('.lp-dd').forEach(function (dd) {
    dd.addEventListener('click', function (e) {
      if (e.target.closest('.lp-dd-menu a, a.lp-dd-btn')) {
        dd.classList.add('closed');
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      }
    });
    dd.addEventListener('mouseleave', function () { dd.classList.remove('closed'); });
    var btn = dd.querySelector('.lp-dd-btn');
    if (btn) btn.addEventListener('focus', function () { dd.classList.remove('closed'); });
  });
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
})();

/* ── Agents: highlight the selected agent card (menu link, hash or click) ── */
(function () {
  var cards = document.querySelectorAll('.lp-agents .lp-feature-card[id]');
  if (!cards.length) return;
  function hl(id) { cards.forEach(function (c) { c.classList.toggle('agent-hl', c.id === id); }); }
  function fromHash() { var h = (location.hash || '').slice(1); hl(/^a-/.test(h) ? h : ''); }
  document.querySelectorAll('a[href*="#a-"]').forEach(function (a) {
    a.addEventListener('click', function () { hl(a.getAttribute('href').split('#')[1]); });
  });
  cards.forEach(function (c) { c.addEventListener('click', function () { hl(c.id); }); });
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();

/* If someone opens a page with ".html" in the address (old link, bookmark), show the clean address. */
(function () {
  try {
    var h = location.hostname;
    if (!/^(www\.)?testovex\.com$/.test(h)) return;
    var path = location.pathname;
    if (!/\.html$/.test(path)) return;
    var clean = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    history.replaceState(null, '', clean + location.search + location.hash);
  } catch (e) { /* address bar stays as is */ }
})();
