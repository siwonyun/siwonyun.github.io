/*
 * /editor — write a note here, preview it as it will look on the site, then
 * download the .md and commit it. Nothing is uploaded anywhere; the draft only
 * ever lives in this browser's localStorage.
 *
 * The preview runs marked, not kramdown, so it is a close likeness rather than
 * the real build. The gaps that matter are patched below: kramdown's $$…$$
 * maths, its trailing-backslash line breaks, its {::nomarkdown} spans, its
 * footnotes, and the top bar the front matter's `nav:` asks for.
 */
(function () {
  'use strict';

  var input = document.querySelector('[data-editor-input]');
  if (!input) return;

  var render = document.querySelector('[data-editor-render]');
  var navSlot = document.querySelector('[data-editor-nav]');
  var preview = document.querySelector('[data-editor-preview]');
  var panes = document.querySelector('.editor-panes');
  var shell = document.querySelector('.editor');
  var status = document.querySelector('[data-editor-status]');
  var nameField = document.querySelector('[data-editor-name]');

  var DRAFT_KEY = 'notes-editor-draft';
  var VIEW_KEY = 'notes-editor-view';

  /* ---------- text insertion that the browser can undo ---------- */

  /*
   * execCommand('insertText') is the only way to change a textarea and keep the
   * native undo stack, so every helper goes through here rather than assigning
   * to .value — otherwise ctrl+Z would wipe out everything typed before too.
   */
  function insertAt(start, end, text, selStart, selEnd) {
    input.focus();
    input.setSelectionRange(start, end);

    var ok = false;
    try {
      ok = document.execCommand('insertText', false, text);
    } catch (e) {
      ok = false;
    }
    if (!ok) input.setRangeText(text, start, end, 'end');

    if (selStart !== undefined) input.setSelectionRange(selStart, selEnd);
    changed();
  }

  function selection() {
    return {
      start: input.selectionStart,
      end: input.selectionEnd,
      text: input.value.slice(input.selectionStart, input.selectionEnd)
    };
  }

  /* ---------- snippets ---------- */

  /* _includes/examples/*.md, baked into the page by the layout */
  function example(name) {
    var tag = document.querySelector('[data-example="' + name + '"]');
    return tag ? tag.textContent.replace(/^\n/, '') : '';
  }

  var STARTER = example('starter');

  var SNIPPETS = {
    h2: { line: '## ' },
    h3: { line: '### ' },
    h4: { line: '#### ' },
    ul: { line: '- ' },
    ol: { line: '1. ' },
    quote: { line: '> ' },

    bold: { wrap: ['**', '**'], hint: 'bold text' },
    italic: { wrap: ['*', '*'], hint: 'italic text' },
    code: { wrap: ['`', '`'], hint: 'code' },
    sup: { wrap: ['<sup>', '</sup>'], hint: 'text' },
    kbd: { wrap: ['<kbd>', '</kbd>'], hint: 'Ctrl' },
    link: { wrap: ['[', '](https://)'], hint: 'link text' },
    'math-inline': { wrap: ['$$', '$$'], hint: 'x' },

    hr: { block: '---' },
    codeblock: { block: '```\ncode\n```' },
    'math-block': { block: '$$\nformula\n$$' },

    aligned: { block: '$$\n\\begin{aligned}\n  a &= b \\\\\n    &= c\n\\end{aligned}\n$$' },
    cases: { block: '$$\nf(x) =\n\\begin{cases}\n  x & x > 0 \\\\\n  0 & x \\le 0\n\\end{cases}\n$$' },
    matrix: { block: '$$\nA =\n\\begin{bmatrix}\n  a_{11} & a_{12} \\\\\n  a_{21} & a_{22}\n\\end{bmatrix}\n$$' },

    table: {
      block: [
        '| Left | Center | Right |',
        '|:-----|:------:|-------:|',
        '|      |        |        |',
        '|      |        |        |'
      ].join('\n')
    },

    /* The site numbers figures from <figure>; a bare <div> leaves them at 0. */
    figure: {
      block: '<figure>\n  <img src="./image/file.png" alt="description">\n  <figcaption>Caption</figcaption>\n</figure>'
    },

    theorem: { block: '<div class="theorem">\n  Statement.\n</div>' },
    lemma: { block: '<div class="lemma">\n  Statement.\n</div>' },
    definition: { block: '<div class="definition">\n  Definition.\n</div>' },
    proof: { block: '<div class="proof">\n  Trivial.\n</div>' }
  };

  function applyWrap(spec) {
    var sel = selection();
    var body = sel.text || spec.hint || '';
    var from = sel.start + spec.wrap[0].length;
    insertAt(sel.start, sel.end, spec.wrap[0] + body + spec.wrap[1], from, from + body.length);
  }

  function applyLine(spec) {
    var value = input.value;
    var start = value.lastIndexOf('\n', input.selectionStart - 1) + 1;
    var end = value.indexOf('\n', input.selectionEnd);
    if (end === -1) end = value.length;

    var lines = value.slice(start, end).split('\n').map(function (line, i) {
      var prefix = spec.line === '1. ' ? (i + 1) + '. ' : spec.line;
      return line.indexOf(prefix) === 0 ? line.slice(prefix.length) : prefix + line;
    });
    insertAt(start, end, lines.join('\n'));
  }

  function padding(before, after) {
    return {
      lead: before === '' || /\n\n$/.test(before) ? '' : (/\n$/.test(before) ? '\n' : '\n\n'),
      tail: after === '' || /^\n\n/.test(after) ? '' : (/^\n/.test(after) ? '\n' : '\n\n')
    };
  }

  function applyBlock(text) {
    var sel = selection();
    var pad = padding(input.value.slice(0, sel.start), input.value.slice(sel.end));
    insertAt(sel.start, sel.end, pad.lead + text + pad.tail);
  }

  /*
   * One tag per margin note: site.js adds the label and checkbox that fold it
   * away on a narrow screen, so nothing here has to invent a unique id.
   *
   * Only the figure form is wrapped in {::nomarkdown}: kramdown does not know
   * <figcaption> in span context and would escape it. A note that is only text
   * is left alone, because kramdown reads the inside of span-level HTML as
   * markdown — so links and emphasis keep working there, which they cannot do
   * inside {::nomarkdown}.
   */
  function applySidenote(kind, src) {
    var text = kind === 'figure'
      ? '{::nomarkdown}<figure class="sn"><img src="' + (src || './image/file.png') + '" alt="description">' +
        '<figcaption>Caption</figcaption></figure>{:/}'
      : '<span class="sn">A note for the margin.</span>';

    var sel = selection();
    insertAt(sel.start, sel.end, text);
  }

  function applyFootnote() {
    var n = 1;
    while (input.value.indexOf('[^' + n + ']:') !== -1) n++;

    var sel = selection();
    var marker = '[^' + n + ']';
    var tailNeedsBreak = /\n$/.test(input.value) ? '' : '\n';
    /* one insertion, so one undo step puts the marker and its definition back */
    insertAt(sel.start, input.value.length,
      marker + input.value.slice(sel.end) + tailNeedsBreak + '\n[^' + n + ']: Footnote text.\n',
      sel.start + marker.length, sel.start + marker.length);
  }

  function runSnippet(key) {
    if (key === 'sidenote') return applySidenote('figure');
    if (key === 'sidenote-text') return applySidenote('text');
    if (key === 'footnote') return applyFootnote();

    var spec = SNIPPETS[key];
    if (!spec) return;
    if (spec.wrap) return applyWrap(spec);
    if (spec.line) return applyLine(spec);
    if (spec.block) return applyBlock(spec.block);
  }

  document.querySelectorAll('[data-snippet]').forEach(function (button) {
    button.addEventListener('click', function () { runSnippet(button.dataset.snippet); });
  });

  document.querySelectorAll('[data-snippet-menu]').forEach(function (menu) {
    menu.addEventListener('change', function () {
      var key = menu.value;
      menu.selectedIndex = 0;
      if (key) runSnippet(key);
    });
  });

  /* ---------- link search ---------- */

  /*
   * Typing [[ anywhere in the body opens a search over the site's own pages and
   * PDFs, baked in at build time. Picking one writes a normal markdown link.
   */
  var sitemap = [];
  try {
    sitemap = JSON.parse(document.querySelector('[data-editor-sitemap]').textContent);
    /* GitHub Pages serves foo.html at /foo — link to the tidier form */
    sitemap.forEach(function (item) { item.u = item.u.replace(/\.html$/, ''); });
  } catch (e) {}

  var completeBox = document.querySelector('[data-editor-complete]');
  var completeState = null;

  function measureCaret() {
    var mirror = document.createElement('div');
    var cs = getComputedStyle(input);
    ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
     'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
     'borderTopWidth', 'borderLeftWidth', 'whiteSpace', 'wordWrap', 'tabSize'
    ].forEach(function (prop) { mirror.style[prop] = cs[prop]; });

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.width = input.clientWidth + 'px';
    mirror.textContent = input.value.slice(0, input.selectionStart);

    var marker = document.createElement('span');
    marker.textContent = '​';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    var box = input.getBoundingClientRect();
    var top = box.top + marker.offsetTop - input.scrollTop;
    var left = box.left + marker.offsetLeft - input.scrollLeft;
    mirror.remove();

    var lineHeight = parseFloat(cs.lineHeight) || 18;
    return { top: top + lineHeight, left: left, lineHeight: lineHeight };
  }

  function closeComplete() {
    completeState = null;
    completeBox.hidden = true;
    completeBox.innerHTML = '';
  }

  function openComplete(from, query) {
    var needle = query.toLowerCase();
    var hits = sitemap.filter(function (item) {
      return item.t.toLowerCase().indexOf(needle) !== -1 ||
        item.u.toLowerCase().indexOf(needle) !== -1;
    }).slice(0, 8);

    if (!hits.length) return closeComplete();

    completeState = { from: from, query: query, hits: hits, index: 0 };
    completeBox.innerHTML = hits.map(function (item, i) {
      return '<button type="button" role="option" data-i="' + i + '"' +
        (i === 0 ? ' aria-selected="true"' : '') + '>' +
        '<span class="editor-complete-kind">' + item.k + '</span>' +
        '<span class="editor-complete-title"></span>' +
        '<span class="editor-complete-url"></span></button>';
    }).join('');

    [].forEach.call(completeBox.children, function (row, i) {
      row.querySelector('.editor-complete-title').textContent = hits[i].t;
      row.querySelector('.editor-complete-url').textContent = hits[i].u;
      row.addEventListener('mousedown', function (event) {
        event.preventDefault();
        choose(i);
      });
    });

    var at = measureCaret();
    completeBox.style.top = '0px';
    completeBox.style.left = '0px';
    completeBox.hidden = false;

    /* flip above the caret, or slide left, rather than run off the window */
    var size = completeBox.getBoundingClientRect();
    var top = at.top + size.height > window.innerHeight - 8
      ? at.top - at.lineHeight - size.height
      : at.top;
    var left = Math.min(at.left, window.innerWidth - size.width - 8);

    var maxTop = window.innerHeight - size.height - 8;
    completeBox.style.top = Math.max(8, Math.min(top, maxTop)) + 'px';
    completeBox.style.left = Math.max(8, left) + 'px';
  }

  function markSelected() {
    [].forEach.call(completeBox.children, function (row, i) {
      if (i === completeState.index) row.setAttribute('aria-selected', 'true');
      else row.removeAttribute('aria-selected');
    });
  }

  function choose(i) {
    if (!completeState) return;
    var item = completeState.hits[i];
    var from = completeState.from;
    var to = input.selectionStart;
    closeComplete();
    var text = '[' + item.t + '](' + item.u + ')';
    insertAt(from, to, text, from + 1, from + 1 + item.t.length);
  }

  function refreshComplete() {
    var upto = input.value.slice(0, input.selectionStart);
    var open = upto.lastIndexOf('[[');
    if (open === -1) return closeComplete();

    var query = upto.slice(open + 2);
    if (/[\]\n]/.test(query)) return closeComplete();
    openComplete(open, query);
  }

  input.addEventListener('keydown', function (event) {
    if (!completeState) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      var step = event.key === 'ArrowDown' ? 1 : -1;
      completeState.index = (completeState.index + step + completeState.hits.length) %
        completeState.hits.length;
      markSelected();
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      choose(completeState.index);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeComplete();
    }
  });

  input.addEventListener('blur', function () { window.setTimeout(closeComplete, 120); });

  input.addEventListener('keydown', function (event) {
    if (event.key !== 'k' && event.key !== 'K') return;
    if (!event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    var sel = selection();
    insertAt(sel.start, sel.end, '[[');
    refreshComplete();
  });

  var sitelinkButton = document.querySelector('[data-editor-sitelink]');
  if (sitelinkButton) {
    sitelinkButton.addEventListener('click', function () {
      var sel = selection();
      insertAt(sel.start, sel.end, '[[');
      refreshComplete();
    });
  }

  /* ---------- images dropped onto the editor ---------- */

  /*
   * A static site has nowhere to upload to, so a dropped image is written as
   * ./image/<name> — the path it will have once the file is committed — and the
   * preview shows the dropped bytes in the meantime. The status bar lists what
   * still needs copying.
   *
   * An object URL dies with the page, so the bytes themselves go to IndexedDB
   * (localStorage holds strings only, and photos would blow its few MB anyway).
   * On load the URLs are made again from what is stored, so a refresh no longer
   * leaves broken images behind.
   */
  var pendingImages = {};
  var IMAGE_DB = 'notes-editor-images';
  var IMAGE_STORE = 'files';
  var dbPromise = null;

  function withStore(mode) {
    if (!window.indexedDB) return null;
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        var request = window.indexedDB.open(IMAGE_DB, 1);
        request.onupgradeneeded = function () {
          request.result.createObjectStore(IMAGE_STORE);
        };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error); };
      });
    }
    /* the transaction is opened and used in the same turn, so it cannot go
       inactive while we wait on it */
    return dbPromise.then(function (db) {
      return db.transaction(IMAGE_STORE, mode).objectStore(IMAGE_STORE);
    });
  }

  function keepImage(file) {
    var store = withStore('readwrite');
    if (!store) return;
    store.then(function (s) { s.put(file, file.name); }).catch(function () {
      note('Could not store the image in this browser — it will be gone on reload');
    });
  }

  function forgetImages(names) {
    if (!names.length) return;
    var store = withStore('readwrite');
    if (!store) return;
    store.then(function (s) { names.forEach(function (name) { s.delete(name); }); })
      .catch(function () {});
  }

  function holdImage(name, blob) {
    if (pendingImages[name]) URL.revokeObjectURL(pendingImages[name]);
    pendingImages[name] = URL.createObjectURL(blob);
  }

  /* Only the images the draft still points at are worth keeping; anything left
     over from a note since rewritten would sit in the database for good. */
  function restoreImages() {
    var store = withStore('readonly');
    if (!store) return;

    store.then(function (s) {
      var request = s.openCursor();
      var stale = [];
      request.onsuccess = function () {
        var cursor = request.result;
        if (cursor) {
          if (input.value.indexOf(cursor.key) === -1) stale.push(cursor.key);
          else holdImage(cursor.key, cursor.value);
          cursor.continue();
          return;
        }
        forgetImages(stale);
        if (Object.keys(pendingImages).length) {
          showPendingImages();
          status.textContent = idleStatus();
        }
      };
    }).catch(function () {});
  }

  function pendingList() {
    var names = Object.keys(pendingImages);
    return names.length
      ? names.length + ' image(s) are not in the repository yet — copy them into image/: ' + names.join(', ')
      : '';
  }

  /* caretPositionFromPoint reports the character offset inside a textarea;
     caretRangeFromPoint does not — it stops at the shadow tree. */
  function caretFromPoint(x, y) {
    if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y);
      if (pos && pos.offsetNode === input) return pos.offset;
    }
    if (document.caretRangeFromPoint) {
      var range = document.caretRangeFromPoint(x, y);
      if (range && range.startContainer === input) return range.startOffset;
    }
    return null;
  }

  input.addEventListener('dragover', function (event) {
    if (!event.dataTransfer || !event.dataTransfer.types) return;
    if ([].indexOf.call(event.dataTransfer.types, 'Files') === -1) return;
    event.preventDefault();
    input.classList.add('is-dropping');
  });

  input.addEventListener('dragleave', function () {
    input.classList.remove('is-dropping');
  });

  input.addEventListener('drop', function (event) {
    var files = [].filter.call((event.dataTransfer && event.dataTransfer.files) || [],
      function (file) { return /^image\//.test(file.type); });
    if (!files.length) return; /* let text drops behave normally */

    event.preventDefault();
    input.classList.remove('is-dropping');

    var at = caretFromPoint(event.clientX, event.clientY);
    if (at === null || at === undefined) at = input.selectionStart;

    var blocks = files.map(function (file) {
      holdImage(file.name, file);
      keepImage(file);
      return '<figure>\n  <img src="./image/' + file.name + '" alt="description">\n' +
        '  <figcaption>Caption</figcaption>\n</figure>';
    });

    var pad = padding(input.value.slice(0, at), input.value.slice(at));
    insertAt(at, at, pad.lead + blocks.join('\n\n') + pad.tail);
    note(files.length + ' inserted');
  });

  function showPendingImages() {
    if (!Object.keys(pendingImages).length) return;
    render.querySelectorAll('img[src]').forEach(function (img) {
      var name = decodeURIComponent((img.getAttribute('src') || '').split('/').pop());
      if (pendingImages[name]) img.src = pendingImages[name];
    });
  }

  /* ---------- front matter ---------- */

  function unquote(value) {
    return value.trim().replace(/^["']|["']$/g, '');
  }

  /* Enough of the front matter to mirror what the layout does with it. */
  function frontMatter(src) {
    var match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
    if (!match) return null;

    var lines = match[1].split(/\r?\n/);
    var meta = { title: '', navTitle: '', nav: [] };
    var inNav = false;
    var current = null;

    lines.forEach(function (line) {
      var top = /^([A-Za-z_][\w-]*):(.*)$/.exec(line);
      if (top) {
        inNav = top[1] === 'nav';
        if (top[1] === 'title') meta.title = unquote(top[2]);
        if (top[1] === 'nav_title') meta.navTitle = unquote(top[2]);
        current = null;
        return;
      }
      if (!inNav) return;

      var item = /^\s*-\s*(\w+):\s*(.*)$/.exec(line);
      if (item) {
        current = {};
        current[item[1]] = unquote(item[2]);
        meta.nav.push(current);
        return;
      }
      var field = /^\s+(\w+):\s*(.*)$/.exec(line);
      if (field && current) current[field[1]] = unquote(field[2]);
    });

    return meta;
  }

  function drawNav(meta) {
    navSlot.innerHTML = '';
    var hasNav = !!(meta && meta.nav.length);
    preview.classList.toggle('has-preview-nav', hasNav);
    if (!hasNav) return;

    var nav = document.createElement('nav');
    nav.className = 'page-nav';
    var inner = document.createElement('div');
    inner.className = 'page-nav-inner';

    var brand = document.createElement('a');
    brand.className = 'page-nav-brand';
    brand.href = '#';
    /* page-chrome.html reads `page.nav_title | default: site.title` — the page's
       own title is never the brand, so the preview must not fall back to it */
    brand.textContent = meta.navTitle || navSlot.dataset.siteTitle || '';
    inner.appendChild(brand);

    var list = document.createElement('ul');
    list.className = 'page-nav-links';
    meta.nav.forEach(function (item) {
      if (!item.title) return;
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#';
      link.textContent = item.title;
      li.appendChild(link);
      list.appendChild(li);
    });

    inner.appendChild(list);
    nav.appendChild(inner);
    navSlot.appendChild(nav);
  }

  /* ---------- preview ---------- */

  function extractMath(src) {
    var store = [];

    function stash(tex, display) {
      store.push({ tex: tex, display: display });
      return '%%MATH' + (store.length - 1) + '%%';
    }

    /*
     * One pass over the source, because the alternatives have to be able to
     * outrank each other:
     *
     *  - Code comes first, and is handed back untouched. Otherwise the `$$` in a
     *    sentence explaining the syntax would open a formula that closes on the
     *    next real one, hiding a whole page of prose inside it. kramdown does not
     *    read maths inside backticks either.
     *  - Display maths is only what takes up whole lines by itself — fenced by a
     *    lone $$, or a single line that is nothing but $$…$$. Neither may run past
     *    the end of its line, or "…$$f$$의 값" (inline maths with text after it)
     *    would fail to close and swallow the next display block's opening $$.
     *  - Anything else between $$ … $$ is inline.
     */
    var TOKEN = new RegExp([
      '```[\\s\\S]*?```',                                                       /* fenced code */
      '(`+)[\\s\\S]*?\\1',                                                      /* code span */
      '(^|\\n)[ \\t]*\\$\\$[ \\t]*\\n([\\s\\S]*?)\\n[ \\t]*\\$\\$[ \\t]*(?=\\n|$)', /* $$ on its own lines */
      '(^|\\n)[ \\t]*\\$\\$([^\\n]+?)\\$\\$[ \\t]*(?=\\n|$)',                      /* a line that is just $$…$$ */
      '\\$\\$([\\s\\S]*?)\\$\\$'                                                /* inline */
    ].join('|'), 'g');

    src = src.replace(TOKEN, function (m, tick, blockLead, blockTex, lineLead, lineTex, inlineTex) {
      if (tick !== undefined || m.slice(0, 3) === '```') return m;
      if (blockTex !== undefined) return blockLead + stash(blockTex, true);
      if (lineTex !== undefined) return lineLead + stash(lineTex, true);
      if (inlineTex !== undefined) return stash(inlineTex, false);
      return m;
    });

    return { src: src, store: store };
  }

  /*
   * A blank line anywhere in a list makes CommonMark call the whole list loose
   * and wrap every item's text in <p>. kramdown is finer grained: an item that
   * opens with a plain line running straight into a nested list keeps that line
   * bare, and only the paragraph after the blank line becomes a <p>. Without
   * this the item's first line picks up paragraph margins the real page has not
   * got.
   */
  function tightenLists(html) {
    var slate = document.createElement('template');
    slate.innerHTML = html;

    slate.content.querySelectorAll('li > p:first-child').forEach(function (p) {
      var after = p.nextElementSibling;
      if (!after || (after.tagName !== 'UL' && after.tagName !== 'OL')) return;
      while (p.firstChild) p.parentNode.insertBefore(p.firstChild, p);
      p.parentNode.removeChild(p);
    });

    return slate.innerHTML;
  }

  /* marked wraps a lone placeholder in <p>, but kramdown leaves display maths as
     a block of its own — and a <p> here would pick up the first-line indent. */
  function unwrapDisplay(html, store) {
    return html.replace(/<p>\s*(%%MATH(\d+)%%)\s*<\/p>/g, function (m, holder, i) {
      return store[Number(i)] && store[Number(i)].display ? holder : m;
    });
  }

  function restoreMath(html, store) {
    return html.replace(/%%MATH(\d+)%%/g, function (m, i) {
      var item = store[Number(i)];
      var tex = item.tex.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      return item.display ? '\\[' + tex + '\\]' : '\\(' + tex + '\\)';
    });
  }

  /* marked has no footnotes, so build what kramdown emits — including the
     .reversefootnote link the stylesheet turns back into the entry number. */
  function extractFootnotes(src) {
    var defs = {};
    var order = [];

    src = src.replace(/^\[\^([^\]]+)\]:[ \t]*(.*)$/gm, function (m, id, text) {
      defs[id] = text.trim();
      return '';
    });

    src = src.replace(/\[\^([^\]]+)\]/g, function (m, id) {
      if (!Object.prototype.hasOwnProperty.call(defs, id)) return m;
      if (order.indexOf(id) === -1) order.push(id);
      return '<sup id="fnref:' + id + '" role="doc-noteref">' +
        '<a href="#fn:' + id + '" class="footnote" rel="footnote">' +
        (order.indexOf(id) + 1) + '</a></sup>';
    });

    return { src: src, defs: defs, order: order };
  }

  function footnoteSection(notes) {
    if (!notes.order.length) return '';
    var items = notes.order.map(function (id) {
      return '<li id="fn:' + id + '" role="doc-endnote"><p>' +
        window.marked.parseInline(notes.defs[id]) +
        ' <a href="#fnref:' + id + '" class="reversefootnote" role="doc-backlink">↩</a>' +
        '</p></li>';
    }).join('');
    return '<div class="footnotes" role="doc-endnotes"><ol>' + items + '</ol></div>';
  }

  function toHtml(src) {
    /* CRLF would leave a \r between the trailing backslash and the line end,
       so the hard-break rule below would never match */
    src = src.replace(/\r\n?/g, '\n');
    src = src.replace(/^---\n[\s\S]*?\n---[ \t]*(\n|$)/, '');

    var math = extractMath(src);
    var notes = extractFootnotes(math.src);
    var body = notes.src
      .replace(/\\{1,2}[ \t]*$/gm, '  ')
      .replace(/\{::nomarkdown\}/g, '')
      .replace(/\{:\/\}/g, '');

    var html = window.marked.parse(body, { gfm: true }) + footnoteSection(notes);
    return restoreMath(tightenLists(unwrapDisplay(html, math.store)), math.store);
  }

  /* The real pages grow a contents rail in the left margin; the preview builds
     one from the same markup so the same stylesheet lays it out. It is rebuilt
     only when the headings themselves change, so it does not blink on every
     keystroke — and the entries keep pointing at live heading elements. */
  var tocNav = null;
  var tocSig = null;

  function syncToc() {
    var headings = [].filter.call(render.querySelectorAll('h2, h3'), function (h) {
      return h.textContent.trim();
    });
    if (headings.length < 2) headings = [];

    var sig = headings.map(function (h) { return h.tagName + h.textContent; }).join('\u0000');
    if (sig === tocSig) return;
    tocSig = sig;

    if (tocNav) { render.removeChild(tocNav); tocNav = null; }
    tocItems = null;
    if (!headings.length) return;

    var nav = document.createElement('nav');
    nav.className = 'page-toc';
    nav.setAttribute('aria-label', 'Contents');

    var inner = document.createElement('div');
    inner.className = 'page-toc-inner';
    inner.innerHTML = '<p class="page-toc-label">Contents</p>';

    var root = document.createElement('ol');
    var parent = null;
    var sub = null;
    var items = [];

    headings.forEach(function (heading, i) {
      if (!heading.id) heading.id = 'preview-h' + i;
      var li = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.addEventListener('click', function (event) {
        event.preventDefault();
        preview.scrollTop += heading.getBoundingClientRect().top -
          preview.getBoundingClientRect().top - 24;
      });
      li.appendChild(link);

      if (heading.tagName === 'H3' && parent) {
        if (!sub) { sub = document.createElement('ol'); parent.appendChild(sub); }
        sub.appendChild(li);
      } else {
        root.appendChild(li);
        parent = li;
        sub = null;
      }
      items.push({ heading: heading, li: li });
    });

    inner.appendChild(root);
    nav.appendChild(inner);
    render.insertBefore(nav, render.firstChild);
    tocNav = nav;
    tocItems = items;
  }

  var tocItems = null;
  function markCurrent() {
    if (!tocItems || !tocItems.length) return;
    var line = preview.getBoundingClientRect().top + 56;
    var current = tocItems[0];
    tocItems.forEach(function (item) {
      if (item.heading.getBoundingClientRect().top <= line) current = item;
      item.li.classList.remove('is-active');
    });
    current.li.classList.add('is-active');
  }

  preview.addEventListener('scroll', markCurrent, { passive: true });

  /* Everything below keeps the preview from being rebuilt wholesale. Blocks are
     compared as source strings, so KaTeX's spans and the ids we hand out later
     never confuse the comparison: what the markdown did not change stays as the
     very same element, images and all. */
  var blockNodes = [];   /* per block, the live nodes it owns, in order */
  var blockHtml = [];    /* the markup each block was built from */

  /* Display maths arrives as a bare "\[…\]" text node — that is what kramdown
     writes — so a block is not always an element, and KaTeX may turn one text
     node into several nodes. Hence a block owns a list, not a single node. */
  function blockKey(node) {
    return node.nodeType === 1 ? node.outerHTML : 'text:' + node.nodeValue;
  }

  function dress(node) {
    /* the same wiring a real page gets, so a <span class="sn"> previews as the
       margin note it will become */
    if (typeof window.initSidenotes === 'function') window.initSidenotes(node);

    if (typeof window.renderMathInElement === 'function') {
      window.renderMathInElement(node, {
        delimiters: [
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
        throwOnError: false,
        errorColor: '#cc0000'
      });
    }

    /* the same test site.js makes, host check included — without it a link to
       our own /coursework resolves to http://…/coursework and reads as external */
    node.querySelectorAll('a[href]').forEach(function (link) {
      if (link.target) return;
      if (link.protocol !== 'http:' && link.protocol !== 'https:') return;
      if (link.host === window.location.host) return;

      link.target = '_blank';
      link.rel = link.rel ? link.rel + ' noopener noreferrer' : 'noopener noreferrer';
    });
  }

  function patch(html) {
    /* a template's contents are inert, so the blocks we end up discarding never
       ask the network for their images */
    var slate = document.createElement('template');
    slate.innerHTML = html;

    var next = [].filter.call(slate.content.childNodes, function (n) {
      return n.nodeType === 1 || (n.nodeType === 3 && n.nodeValue.trim());
    });
    var nextHtml = next.map(blockKey);

    /* An edit almost always touches one block, so matching from both ends finds
       the run that actually changed without a full diff. */
    var head = 0;
    while (head < blockHtml.length && head < nextHtml.length &&
           blockHtml[head] === nextHtml[head]) head++;

    var tail = 0;
    while (tail < blockHtml.length - head && tail < nextHtml.length - head &&
           blockHtml[blockHtml.length - 1 - tail] === nextHtml[nextHtml.length - 1 - tail]) tail++;

    if (head === blockHtml.length && head === nextHtml.length) return;

    var kept = blockNodes.slice(blockNodes.length - tail);
    var anchor = (kept[0] && kept[0][0]) || null;
    var i;
    for (i = head; i < blockNodes.length - tail; i++) {
      blockNodes[i].forEach(function (node) { render.removeChild(node); });
    }

    /* KaTeX runs while the block is still off the page: it is a pure DOM build,
       and doing it here means a "\[…\]" text node is already a rendered element
       by the time we take note of what the block owns. */
    var fresh = next.slice(head, next.length - tail).map(function (node) {
      var holder = document.createElement('div');
      holder.appendChild(node);
      dress(holder);
      var owned = [].slice.call(holder.childNodes);
      owned.forEach(function (n) { render.insertBefore(n, anchor); });
      return owned;
    });

    blockNodes = blockNodes.slice(0, head).concat(fresh, kept);
    blockHtml = nextHtml;

    if (Object.keys(pendingImages).length) showPendingImages();
  }

  /* The link that appears beside a heading on hover. anchor-js skips headings it
     has already done, so calling it after every redraw only touches new ones —
     and it has to run after syncToc, which is what hands out the ids. */
  function addAnchors() {
    if (!window.anchors) return;
    try {
      window.anchors.add('[data-editor-render] h1, [data-editor-render] h2, ' +
        '[data-editor-render] h3, [data-editor-render] h4');
    } catch (e) {}
  }

  var navSig = null;
  var lastHtml = null;
  var drawCost = 0;

  function draw() {
    cancelDraw();
    var started = performance.now();
    var html;
    var meta;
    try {
      meta = frontMatter(input.value);
      html = toHtml(input.value);
    } catch (e) {
      /* the message replaced everything, so nothing below may be reused */
      render.textContent = 'Preview error: ' + e.message;
      blockNodes = [];
      blockHtml = [];
      lastHtml = null;
      tocNav = null;
      tocSig = null;
      tocItems = null;
      return;
    }

    var sig = JSON.stringify(meta);
    if (sig !== navSig) { navSig = sig; drawNav(meta); }

    if (html === lastHtml) return;
    lastHtml = html;

    var keepScroll = preview.scrollTop;
    patch(html);
    syncToc();
    markCurrent();
    addAnchors();
    preview.scrollTop = keepScroll;

    drawCost = Math.max(performance.now() - started, drawCost * 0.8);
  }

  /* Patching is cheap enough to keep up with typing, so the preview redraws on
     the next frame rather than after a pause. Only if a draw turns out to be
     slow — a very long note — does it fall back to waiting for a break. */
  var renderFrame = null;
  var renderTimer = null;

  function cancelDraw() {
    if (renderFrame !== null) window.cancelAnimationFrame(renderFrame);
    window.clearTimeout(renderTimer);
    renderFrame = null;
    renderTimer = null;
  }

  function schedule() {
    /* frames stop coming to a hidden tab, so do not wait for one there */
    if (drawCost > 24 || document.hidden) {
      cancelDraw();
      renderTimer = window.setTimeout(draw, 140);
      return;
    }
    if (renderFrame !== null) return;
    renderFrame = window.requestAnimationFrame(draw);
  }

  function changed() {
    repaint();
    schedule();
    try {
      localStorage.setItem(DRAFT_KEY, input.value);
    } catch (e) {
      note('Could not save in this browser — download the file to keep it');
    }
  }

  var HINT = '[[ or \u2318K / Ctrl+K searches this site for a link \u00b7 drag the seam to resize';

  function idleStatus() {
    var pending = pendingList();
    return pending ? pending + ' · ' + HINT : HINT;
  }

  var noteTimer;
  function note(message) {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(function () { status.textContent = idleStatus(); }, 2200);
  }

  /* Pasted CRLF text would double-space the highlight layer behind the textarea
     and end up in the downloaded file; normalise it as soon as it arrives. */
  function normaliseNewlines() {
    if (input.value.indexOf('\r') === -1) return false;
    var caret = input.selectionStart;
    var before = input.value.slice(0, caret).length;
    var fixed = input.value.replace(/\r\n?/g, '\n');
    var caretFixed = input.value.slice(0, caret).replace(/\r\n?/g, '\n').length;
    insertAt(0, input.value.length, fixed, caretFixed, caretFixed);
    return true;
  }

  input.addEventListener('input', function () {
    if (normaliseNewlines()) return; /* the rewrite fires input again */
    changed();
    refreshComplete();
  });
  input.addEventListener('click', refreshComplete);

  /* Tab indents instead of leaving the editor — unless the search is open. */
  input.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || completeState) return;
    event.preventDefault();
    var sel = selection();
    insertAt(sel.start, sel.end, '    ');
  });

  /* ---------- syntax colours ---------- */

  /*
   * A textarea cannot colour its own text, so a <pre> sits behind it holding
   * the same characters marked up, and the textarea's own text is transparent.
   * Both boxes share the font, padding and wrapping, so the layers line up.
   */
  var codeLayer = document.querySelector('[data-editor-highlight]');

  function escapeHtml(text) {
    return text.replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  /* one pass with alternation, so a match can never land inside another span.
     A regex literal, not new RegExp — the escaping is hard enough once. */
  var INLINE = /(\{::nomarkdown\}|\{:\/\})|(&lt;\/?[A-Za-z][^&]*?&gt;)|(\$\$[\s\S]*?\$\$)|(`[^`]*`)|(\[\^[^\]]+\])|(\[\[[^\]\n]*)|(\[[^\]]*\]\([^)]*\))|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)/g;

  var INLINE_CLASS = ['tk-meta', 'tk-html', 'tk-math', 'tk-code', 'tk-link',
    'tk-link', 'tk-link', 'tk-strong', 'tk-em'];

  function markInline(escaped) {
    return escaped.replace(INLINE, function () {
      for (var i = 1; i <= INLINE_CLASS.length; i++) {
        if (arguments[i] !== undefined) {
          return '<span class="' + INLINE_CLASS[i - 1] + '">' + arguments[i] + '</span>';
        }
      }
      return arguments[0];
    });
  }

  function paint(src) {
    var lines = src.split('\n');
    var inFront = lines[0].trim() === '---';
    var inFence = false;

    return lines.map(function (line, i) {
      var escaped = escapeHtml(line);

      if (inFront) {
        if (i > 0 && line.trim() === '---') inFront = false;
        return '<span class="tk-meta">' + escaped + '</span>';
      }
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return '<span class="tk-code">' + escaped + '</span>';
      }
      if (inFence) return '<span class="tk-code">' + escaped + '</span>';
      if (/^#{1,6}\s/.test(line)) return '<span class="tk-head">' + escaped + '</span>';
      if (/^\s*&gt;/.test(escaped)) return '<span class="tk-quote">' + escaped + '</span>';
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) return '<span class="tk-rule">' + escaped + '</span>';

      var marked = markInline(escaped);
      return marked.replace(/^(\s*)([-*+]|\d+\.)(\s)/,
        '$1<span class="tk-marker">$2</span>$3');
    }).join('\n');
  }

  function repaint() {
    /* the trailing newline keeps the last line's height in the <pre> */
    codeLayer.innerHTML = paint(input.value) + '\n';
    codeLayer.scrollTop = input.scrollTop;
    codeLayer.scrollLeft = input.scrollLeft;
  }

  input.addEventListener('scroll', function () {
    codeLayer.scrollTop = input.scrollTop;
    codeLayer.scrollLeft = input.scrollLeft;
  }, { passive: true });

  /* ---------- layout ---------- */

  /* Half the window is too narrow for a full-width page but about right for a
     tablet, so each orientation keeps its own device — and its own memory of
     what you last picked there. */
  var DEVICE_DEFAULT = { stack: 'full', side: 'tablet' };
  var view = { side: false, swapped: false, devices: {}, split: null };
  try {
    var saved = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null');
    if (saved) {
      view = Object.assign(view, saved);
      if (!saved.devices && saved.device) { /* older single-device state */
        view.devices = {};
        view.devices[saved.side ? 'side' : 'stack'] = saved.device;
      }
      delete view.device;
    }
  } catch (e) {}

  function deviceKey() { return view.side ? 'side' : 'stack'; }
  function device() { return view.devices[deviceKey()] || DEVICE_DEFAULT[deviceKey()]; }

  function applyView() {
    var current = device();
    shell.classList.toggle('is-side-by-side', view.side);
    panes.classList.toggle('is-swapped', view.swapped);
    if (view.split) panes.style.setProperty('--split', view.split + '%');
    else panes.style.removeProperty('--split');
    preview.classList.remove('is-tablet', 'is-phone');
    if (current !== 'full') preview.classList.add('is-' + current);

    document.querySelectorAll('[data-device]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.device === current));
    });

    try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch (e) {}
  }

  document.querySelector('[data-editor-swap]').addEventListener('click', function () {
    view.swapped = !view.swapped;
    applyView();
    note(view.side
      ? (view.swapped ? 'preview on the left' : 'editor on the left')
      : (view.swapped ? 'editor on top' : 'preview on top'));
  });

  document.querySelector('[data-editor-split]').addEventListener('click', function () {
    view.side = !view.side;
    applyView();
    note((view.side ? 'side by side' : 'stacked') + ' \u00b7 ' + device());
  });

  document.querySelectorAll('[data-device]').forEach(function (button) {
    button.addEventListener('click', function () {
      view.devices[deviceKey()] = button.dataset.device;
      applyView();
    });
  });

  /* Drag the seam to resize; double-click puts it back to even. */
  var divider = document.querySelector('[data-editor-divider]');

  divider.addEventListener('pointerdown', function (event) {
    if (event.target.closest('.editor-chips')) return; /* the chips are buttons */
    event.preventDefault();
    divider.setPointerCapture(event.pointerId);
    divider.classList.add('is-dragging');
  });

  divider.addEventListener('pointermove', function (event) {
    if (!divider.classList.contains('is-dragging')) return;
    var box = panes.getBoundingClientRect();
    var fraction = view.side
      ? (event.clientX - box.left) / box.width
      : (event.clientY - box.top) / box.height;
    view.split = Math.round(Math.min(0.85, Math.max(0.15, fraction)) * 1000) / 10;
    applyView();
  });

  ['pointerup', 'pointercancel'].forEach(function (type) {
    divider.addEventListener(type, function () { divider.classList.remove('is-dragging'); });
  });

  divider.addEventListener('dblclick', function (event) {
    if (event.target.closest('.editor-chips')) return;
    view.split = null;
    applyView();
    note('back to even halves');
  });

  applyView();

  /* ---------- file in and out ---------- */

  document.querySelector('[data-editor-download]').addEventListener('click', function () {
    var name = (nameField.value || 'note').trim();
    if (!/\.(md|markdown)$/i.test(name)) name += '.md';

    var url = URL.createObjectURL(new Blob([input.value], { type: 'text/markdown;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    note('downloaded ' + name);
  });

  document.querySelector('[data-editor-open]').addEventListener('change', function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      insertAt(0, input.value.length, String(reader.result));
      nameField.value = file.name;
      note('opened ' + file.name);
    };
    reader.readAsText(file);
    event.target.value = '';
  });

  /* Replacing the whole text goes through insertAt like every other helper, so
     one ctrl+Z brings the draft back if an example was picked by mistake. */
  var exampleMenu = document.querySelector('[data-editor-example]');

  if (exampleMenu) {
    exampleMenu.addEventListener('change', function () {
      var name = exampleMenu.value;
      exampleMenu.selectedIndex = 0;
      if (!name) return;

      var text = example(name);
      if (!text) return note('no example called ' + name);

      insertAt(0, input.value.length, text, 0, 0);
      input.scrollTop = 0;
      preview.scrollTop = 0;
      nameField.value = name + '.md';
      note('loaded the ' + name + ' example — ctrl+Z to go back');
    });
  }

  /* ---------- start ---------- */

  var draft = null;
  try { draft = localStorage.getItem(DRAFT_KEY); } catch (e) {}
  input.value = draft || STARTER;
  repaint();
  draw();
  status.textContent = idleStatus();
  restoreImages();
})();
