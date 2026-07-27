/* Site chrome for the default layout: theme menu + KaTeX rendering. */
(function () {
  'use strict';

  /* ---------- theme ---------- */

  var STORAGE_KEY = 'notes-theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  /*
   * The menu offers Light and Dark only. "Auto" is still the starting state —
   * with nothing stored the page follows the OS and keeps following it — it
   * just is not something to pick, so the marked entry is whichever theme is
   * actually showing rather than the stored preference.
   */
  function readPref() {
    var pref = root.getAttribute('data-theme-pref');
    return pref === 'light' || pref === 'dark' ? pref : 'auto';
  }

  function apply(pref) {
    var theme = pref === 'auto' ? (media.matches ? 'dark' : 'light') : pref;
    root.setAttribute('data-theme-pref', pref);
    root.setAttribute('data-theme', theme);
    choices.forEach(function (button) {
      button.setAttribute('aria-checked', String(button.dataset.themeChoice === theme));
    });
  }

  var menu = document.querySelector('[data-page-menu]');
  var button = document.querySelector('[data-page-menu-button]');
  var popover = document.querySelector('[data-page-menu-popover]');
  var choices = [].slice.call(document.querySelectorAll('[data-theme-choice]'));

  choices.forEach(function (choice) {
    choice.addEventListener('click', function () {
      var pref = choice.dataset.themeChoice;
      apply(pref);
      try {
        localStorage.setItem(STORAGE_KEY, pref);
      } catch (e) {}
      close();
    });
  });

  /* Follow the OS until a theme is picked explicitly. */
  media.addEventListener('change', function () {
    if (readPref() === 'auto') apply('auto');
  });

  apply(readPref());

  /* ---------- menu ---------- */

  function open() {
    popover.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  }

  function close() {
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  if (menu && button && popover) {
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      if (popover.hidden) open();
      else close();
    });

    document.addEventListener('click', function (event) {
      if (!popover.hidden && !menu.contains(event.target)) close();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !popover.hidden) {
        close();
        button.focus();
      }
    });
  }

  /* ---------- math ---------- */

  /*
   * kramdown turns $$...$$ in Markdown into \(...\) (inline) and \[...\] (display).
   * Raw `$$...$$` only survives inside block HTML, which kramdown leaves alone —
   * it is kept as a display delimiter so math inside <div class="theorem"> works.
   */
  function renderMath() {
    if (typeof renderMathInElement !== 'function') return;
    renderMathInElement(document.querySelector('.latex-page') || document.body, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      throwOnError: false,
      errorColor: '#cc0000'
    });
  }

  /* ---------- external links ---------- */

  /*
   * Anything pointing off this host opens in its own tab. Same-host links —
   * including the note PDFs and in-page anchors — are left alone, so navigating
   * the site never scatters tabs. rel="noopener" keeps the opened page from
   * reaching back through window.opener.
   */
  function markExternalLinks() {
    [].forEach.call(document.querySelectorAll('a[href]'), function (link) {
      if (link.target) return;
      if (link.protocol !== 'http:' && link.protocol !== 'https:') return;
      if (link.host === window.location.host) return;

      link.target = '_blank';
      link.rel = link.rel ? link.rel + ' noopener noreferrer' : 'noopener noreferrer';
    });
  }

  /* ---------- table of contents ---------- */

  /*
   * Built from the page's own h2/h3, which kramdown already gave ids. The nav
   * lives inside .latex-page so CSS can park it in the left gutter relative to
   * the text column; it is only visible on screens wide enough to spare one.
   */
  function headingText(heading) {
    var clone = heading.cloneNode(true);
    [].forEach.call(clone.querySelectorAll('.anchorjs-link'), function (link) {
      link.remove();
    });
    return clone.textContent.trim();
  }

  function buildToc() {
    var page = document.querySelector('.latex-page');
    if (!page) return null;

    var headings = [].filter.call(page.querySelectorAll('h2, h3'), function (h) {
      return h.id;
    });
    if (headings.length < 2) return null;

    var nav = document.createElement('nav');
    nav.className = 'page-toc';
    nav.setAttribute('aria-label', 'Contents');

    var inner = document.createElement('div');
    inner.className = 'page-toc-inner';

    var label = document.createElement('p');
    label.className = 'page-toc-label';
    label.textContent = 'Contents';

    var root = document.createElement('ol');
    var parentLi = null;
    var sublist = null;
    var items = [];

    headings.forEach(function (heading) {
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = headingText(heading);
      li.appendChild(link);

      if (heading.tagName === 'H3' && parentLi) {
        if (!sublist) {
          sublist = document.createElement('ol');
          parentLi.appendChild(sublist);
        }
        sublist.appendChild(li);
      } else {
        root.appendChild(li);
        parentLi = li;
        sublist = null;
      }

      items.push({ heading: heading, li: li, link: link });
    });

    inner.appendChild(label);
    inner.appendChild(root);
    nav.appendChild(inner);
    page.insertBefore(nav, page.firstChild);

    return { nav: nav, inner: inner, items: items };
  }

  function initToc() {
    var toc = buildToc();
    if (!toc) return;

    var active = null;

    function setActive(item) {
      if (item === active) return;
      if (active) {
        active.li.classList.remove('is-active');
        active.link.removeAttribute('aria-current');
      }
      active = item;
      active.li.classList.add('is-active');
      active.link.setAttribute('aria-current', 'true');

      /* Keep the marker in view when the list is long enough to scroll. */
      var itemBox = active.li.getBoundingClientRect();
      var listBox = toc.inner.getBoundingClientRect();
      if (itemBox.top < listBox.top || itemBox.bottom > listBox.bottom) {
        toc.inner.scrollTop += itemBox.top - listBox.top - listBox.height / 3;
      }
    }

    /*
     * The active entry is the last heading above a reading line just under the
     * top edge. It sits below the sticky top bar, if the page has one, and below
     * where a click parks a heading (headings carry a matching scroll-margin),
     * so following a link selects the section it went to. It also stays above
     * the first heading at scroll 0, so a section whose subsection follows it
     * immediately can still be current.
     */
    var BASE_LINE_OFFSET = 48;
    var pageNav = document.querySelector('.page-nav');

    function lineOffset() {
      return BASE_LINE_OFFSET +
        (pageNav ? pageNav.getBoundingClientRect().height : 0);
    }

    /*
     * Sections inside the final screenful can never reach that line — the page
     * stops scrolling first — so over the last stretch the line slides down to
     * the bottom of the viewport, giving every trailing section its turn
     * instead of snapping straight to the last one. Padding the page so they
     * could reach the top works too, but leaves dead space under the text.
     */
    function readingLine() {
      var viewport = window.innerHeight;
      var offset = lineOffset();
      var tail = viewport - offset;
      var maxScroll = document.documentElement.scrollHeight - viewport;

      var start = Math.max(0, maxScroll - tail); /* where the slide begins */
      var span = maxScroll - start;
      var progress = span > 0
        ? Math.min(Math.max((window.scrollY - start) / span, 0), 1)
        : 0;

      return window.scrollY + offset + tail * progress;
    }

    function update() {
      if (!toc.nav.offsetParent) return; /* hidden on narrow screens */
      if (pinned) return; /* a link was followed; honour it until the reader scrolls */

      var line = readingLine();
      var current = toc.items[0];

      for (var i = 0; i < toc.items.length; i++) {
        var top = toc.items[i].heading.getBoundingClientRect().top + window.scrollY;
        if (top > line) break;
        current = toc.items[i];
      }
      setActive(current);
    }

    var queued = false;
    function schedule() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        update();
      });
    }

    /*
     * Following a link — a ToC entry, a heading's own anchor, a pasted #hash —
     * pins that entry. Without this the scroll lands the heading at the top and
     * the reading line, or a page that has run out of room to scroll, would
     * immediately hand the highlight to a neighbour. The pin lasts until the
     * reader scrolls on their own; the smooth scroll from the click does not
     * count, which is why this listens for input rather than for scrolling.
     */
    var pinned = false;

    function pinTo(id) {
      if (!id) return;
      for (var i = 0; i < toc.items.length; i++) {
        if (toc.items[i].heading.id === id) {
          pinned = true;
          setActive(toc.items[i]);
          return;
        }
      }
    }

    function unpin() {
      if (!pinned) return;
      pinned = false;
      schedule();
    }

    var SCROLL_KEYS = [
      'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'
    ];

    toc.items.forEach(function (item) {
      item.link.addEventListener('click', function () {
        pinned = true;
        setActive(item);
      });
    });

    window.addEventListener('hashchange', function () {
      pinTo(decodeURIComponent(window.location.hash.slice(1)));
    });

    window.addEventListener('wheel', unpin, { passive: true });
    window.addEventListener('touchmove', unpin, { passive: true });
    window.addEventListener('keydown', function (event) {
      if (SCROLL_KEYS.indexOf(event.key) !== -1) unpin();
    });

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    update();
    pinTo(decodeURIComponent(window.location.hash.slice(1)));
  }

  function init() {
    renderMath();
    markExternalLinks();
    initToc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
