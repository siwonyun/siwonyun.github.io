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

  /* ---------- tidying a table ---------- */

  /*
   * Widths are measured, not counted. The rule of thumb — a Hangul or CJK glyph
   * is two columns — is a terminal convention, and it does not hold here: the
   * monospace stack has no Korean glyphs of its own, so they come from a
   * fallback font at whatever width it likes. Measured on this machine that is
   * 1.44 ASCII columns, not 2, which is why counting characters left Korean
   * tables crooked.
   *
   * Everything is expressed in space-widths, so an all-ASCII table pads exactly
   * as before. A Korean one lands within half a space of true — as close as
   * padding with spaces can get, short of a font whose Hangul really is double
   * width.
   */
  var ruler = null;
  var rulerFont = '';
  var spaceWidth = 0;

  function cellWidth(text) {
    if (!ruler) ruler = document.createElement('canvas').getContext('2d');

    var cs = getComputedStyle(input);
    var font = cs.fontSize + ' ' + cs.fontFamily;
    if (font !== rulerFont) {
      rulerFont = font;
      ruler.font = font;
      spaceWidth = ruler.measureText(' ').width || 1;
    }

    return ruler.measureText(text).width / spaceWidth;
  }

  /* a backslash-escaped pipe is content, not a cell border */
  function splitRow(line) {
    var body = line.trim();
    if (body.charAt(0) === '|') body = body.slice(1);
    if (body.charAt(body.length - 1) === '|') body = body.slice(0, -1);

    var cells = [];
    var cell = '';
    for (var i = 0; i < body.length; i++) {
      var ch = body.charAt(i);
      if (ch === '\\' && body.charAt(i + 1) === '|') { cell += '\\|'; i++; continue; }
      if (ch === '|') { cells.push(cell.trim()); cell = ''; continue; }
      cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  }

  function isRule(cells) {
    return cells.length > 0 && cells.every(function (c) { return /^:?-+:?$/.test(c); });
  }

  function pad(text, room, align) {
    var slack = Math.max(0, Math.round(room - cellWidth(text)));
    if (align === 'right') return new Array(slack + 1).join(' ') + text;
    if (align === 'center') {
      var left = Math.floor(slack / 2);
      return new Array(left + 1).join(' ') + text + new Array(slack - left + 1).join(' ');
    }
    return text + new Array(slack + 1).join(' ');
  }

  function blockAround(at) {
    var value = input.value;
    var from = value.lastIndexOf('\n', at - 1) + 1;
    while (from > 0) {
      var above = value.lastIndexOf('\n', from - 2) + 1;
      if (!value.slice(above, from - 1).trim()) break;
      from = above;
    }

    var to = value.indexOf('\n', at);
    if (to === -1) to = value.length;
    while (to < value.length) {
      var next = value.indexOf('\n', to + 1);
      if (next === -1) next = value.length;
      if (!value.slice(to + 1, next).trim()) break;
      to = next;
    }
    return { from: from, to: to };
  }

  /* which column the caret sits in: the unescaped pipes to its left, less the
     one that opens the row */
  function caretColumn(value, lineStart) {
    var count = 0;
    for (var i = lineStart; i < input.selectionStart; i++) {
      if (value.charAt(i) === '\\') { i++; continue; }
      if (value.charAt(i) === '|') count++;
    }
    return Math.max(0, count - 1);
  }

  /*
   * Every table edit is the same job — read the block, change the cells, write
   * it back lined up — so they share one path and only differ in `change`.
   */
  function withTable(change, quiet) {
    var value = input.value;
    var range = blockAround(input.selectionStart);
    var lines = value.slice(range.from, range.to).split('\n');

    /* Rows are arrays of cells; anything else in the block — an IAL line, say —
       stays a string and is written back untouched. One array, so inserting a
       row cannot slide the two out of step. */
    var rows = lines.map(function (line) {
      return line.trim().charAt(0) === '|' ? splitRow(line) : line;
    });
    if (!rows.some(Array.isArray)) return note('put the caret in a table first');

    var caretLine = value.slice(range.from, input.selectionStart).split('\n').length - 1;
    var caretAtColumn = caretColumn(value, value.lastIndexOf('\n', input.selectionStart - 1) + 1);

    if (change) change(rows, caretAtColumn, caretLine);

    var columns = 0;
    rows.forEach(function (cells) {
      if (Array.isArray(cells)) columns = Math.max(columns, cells.length);
    });

    /* the |:---:| row says how each column is set, and is rebuilt to match */
    var align = [];
    rows.forEach(function (cells) {
      if (!Array.isArray(cells) || !isRule(cells)) return;
      cells.forEach(function (cell, i) {
        var left = cell.charAt(0) === ':';
        var right = cell.charAt(cell.length - 1) === ':';
        align[i] = left && right ? 'center' : (right ? 'right' : (left ? 'left' : ''));
      });
    });

    var room = [];
    rows.forEach(function (cells) {
      if (!Array.isArray(cells) || isRule(cells)) return;
      for (var i = 0; i < columns; i++) {
        room[i] = Math.max(room[i] || 3, cellWidth(cells[i] || ''));
      }
    });
    /* the dashes are ASCII, so a column is at least three of them wide, and the
       room a column takes is rounded to whole spaces before anything is padded */
    for (var i = 0; i < columns; i++) room[i] = Math.max(Math.ceil(room[i] || 3), 3);

    var tidied = rows.map(function (cells) {
      if (!Array.isArray(cells)) return cells;

      var out = [];
      for (var col = 0; col < columns; col++) {
        var text = cells[col] || '';
        if (isRule(cells)) {
          var dashes = new Array(room[col] - 1).join('-');
          out.push(
            align[col] === 'center' ? ':' + dashes + ':' :
            align[col] === 'right' ? '-' + dashes + ':' :
            align[col] === 'left' ? ':' + dashes + '-' : '-' + dashes + '-');
        } else {
          out.push(pad(text, room[col], align[col]));
        }
      }
      return '| ' + out.join(' | ') + ' |';
    });

    var text = tidied.join('\n');
    if (text === lines.join('\n')) return quiet ? undefined : note('already tidy');

    /* Back to the same cell, not just the same line: the column is what the
       next press acts on, and landing at the start of the row would quietly
       make it the first one. */
    var line = Math.min(caretLine, tidied.length - 1);
    var caret = range.from + tidied.slice(0, line).join('\n').length + (line ? 1 : 0);

    var into = tidied[line] || '';
    var pipes = -1;
    for (var at = 0; at < into.length; at++) {
      if (into.charAt(at) === '\\') { at++; continue; }
      if (into.charAt(at) !== '|') continue;
      pipes++;
      if (pipes === caretAtColumn) { caret += Math.min(at + 2, into.length); break; }
    }

    insertAt(range.from, range.to, text, caret, caret);
  }

  function tidyTable() {
    withTable(null);
  }

  /* A column is added to every row at once, the rule row included, and the whole
     table is laid out again — which is the part that is miserable by hand. */
  function addColumn(side) {
    withTable(function (rows, column) {
      var at = side === 'left' ? column : column + 1;
      rows.forEach(function (cells) {
        if (!Array.isArray(cells)) return;
        cells.splice(Math.min(at, cells.length), 0, isRule(cells) ? '---' : '');
      });
    }, true);
  }

  /*
   * Merged cells are the one thing markdown tables cannot express, so this hands
   * the table over to HTML — where colspan and rowspan exist — rather than
   * leaving you to retype it.
   *
   * kramdown does not read markdown inside a block HTML element, so the cells
   * are converted here: marked handles the links and emphasis, and $$…$$ becomes
   * the \(…\) that KaTeX picks up on the page. Any classes on the IAL move onto
   * the <table> itself, since the line they were on is going away.
   */
  function tableToHtml() {
    var value = input.value;
    var range = blockAround(input.selectionStart);
    var lines = value.slice(range.from, range.to).split('\n');

    var rows = [];
    var classes = [];
    lines.forEach(function (line) {
      if (line.trim().charAt(0) === '|') return rows.push(splitRow(line));
      var ial = /^\{:(?![:/])[ \t]*([^}]*)\}/.exec(line.trim());
      if (!ial) return;
      ial[1].split(/\s+/).forEach(function (part) {
        if (part.charAt(0) === '.') classes.push(part.slice(1));
      });
    });
    if (rows.length < 2) return note('put the caret in a table first');

    var align = [];
    var head = rows.shift();
    if (isRule(rows[0])) {
      rows.shift().forEach(function (cell, i) {
        var left = cell.charAt(0) === ':';
        var right = cell.charAt(cell.length - 1) === ':';
        align[i] = left && right ? 'center' : (right ? 'right' : (left ? 'left' : ''));
      });
    }

    function cellHtml(tag, text, column) {
      var style = align[column] ? ' style="text-align: ' + align[column] + '"' : '';

      /* marked reads \( as an escaped bracket and eats the backslash, so the
         maths is held aside while it works and put back afterwards */
      var maths = [];
      var body = text.replace(/\$\$([\s\S]*?)\$\$/g, function (m, tex) {
        maths.push(tex);
        return '@@MATH' + (maths.length - 1) + '@@';
      });

      try { body = window.marked.parseInline(body); } catch (e) {}

      body = body.replace(/@@MATH(\d+)@@/g, function (m, i) {
        return '\\(' + maths[Number(i)] + '\\)';
      });

      return '      <' + tag + style + '>' + body + '</' + tag + '>';
    }

    function rowHtml(cells, tag) {
      return ['    <tr>'].concat(cells.map(function (text, i) {
        return cellHtml(tag, text, i);
      }), ['    </tr>']).join('\n');
    }

    var html = ['<table' + (classes.length ? ' class="' + classes.join(' ') + '"' : '') + '>',
      '  <thead>', rowHtml(head, 'th'), '  </thead>', '  <tbody>']
      .concat(rows.map(function (cells) { return rowHtml(cells, 'td'); }),
        ['  </tbody>', '</table>'])
      .join('\n');

    insertAt(range.from, range.to, html, range.from, range.from);
    note('now HTML — colspan and rowspan work here');
  }

  /* ---------- an HTML table, once it has merged cells ---------- */

  /*
   * Past `to html` the table is markup, so it is read back as markup: parsed
   * into a real table, changed as a DOM, and written out again. Which cell the
   * caret is in is worked out by counting the <td>/<th> tags above it, which
   * holds as long as the source keeps one cell per tag — which is how we write
   * it, and how anyone writes it by hand.
   */
  function htmlTableAt() {
    var value = input.value;
    var range = blockAround(input.selectionStart);
    var text = value.slice(range.from, range.to);
    if (!/^\s*<table[\s>]/i.test(text)) return null;

    var holder = document.createElement('div');
    holder.innerHTML = text;
    var table = holder.querySelector('table');
    if (!table) return null;

    var before = text.slice(0, input.selectionStart - range.from);
    var opened = before.match(/<(?:td|th)\b/gi);
    var cells = [].slice.call(table.querySelectorAll('th, td'));

    return {
      range: range,
      table: table,
      cells: cells,
      cell: opened ? cells[Math.min(opened.length - 1, cells.length - 1)] : null
    };
  }

  /* Where each cell actually sits once spans are taken into account: grid[r][c]
     is whichever cell covers that square. */
  function tableGrid(table) {
    var rows = [].slice.call(table.rows);
    var grid = rows.map(function () { return []; });

    rows.forEach(function (row, r) {
      var c = 0;
      [].forEach.call(row.cells, function (cell) {
        while (grid[r][c]) c++;
        var down = cell.rowSpan || 1;
        var across = cell.colSpan || 1;
        for (var i = 0; i < down; i++) {
          for (var j = 0; j < across; j++) {
            if (grid[r + i]) grid[r + i][c + j] = cell;
          }
        }
        c += across;
      });
    });

    return { rows: rows, grid: grid };
  }

  function cellCorner(model, cell) {
    for (var r = 0; r < model.grid.length; r++) {
      for (var c = 0; c < model.grid[r].length; c++) {
        if (model.grid[r][c] === cell) return { row: r, column: c };
      }
    }
    return null;
  }

  /* `keep` is the cell to leave the caret in — without it every edit would throw
     the caret to the top of the table and the next press would find no cell. */
  function writeHtmlTable(found, table, keep) {
    var indent = '  ';
    var out = [];
    var keepLine = -1;

    function openTag(el) {
      return el.outerHTML.slice(0, el.outerHTML.indexOf('>') + 1);
    }

    function writeRows(host, depth) {
      [].forEach.call(host.children, function (row) {
        out.push(indent.repeat(depth) + '<tr>');
        [].forEach.call(row.cells, function (cell) {
          if (cell === keep) keepLine = out.length;
          out.push(indent.repeat(depth + 1) + cell.outerHTML);
        });
        out.push(indent.repeat(depth) + '</tr>');
      });
    }

    out.push(openTag(table));
    [].forEach.call(table.children, function (section) {
      if (!/^(thead|tbody|tfoot)$/i.test(section.tagName)) return;
      out.push(indent + '<' + section.tagName.toLowerCase() + '>');
      writeRows(section, 2);
      out.push(indent + '</' + section.tagName.toLowerCase() + '>');
    });
    out.push('</table>');

    var text = out.join('\n');
    var caret = found.range.from;
    if (keepLine !== -1) {
      /* just inside the cell's opening tag, so the next press finds this cell */
      caret += out.slice(0, keepLine).join('\n').length + 1 +
        out[keepLine].indexOf('>') + 1;
    }

    insertAt(found.range.from, found.range.to, text, caret, caret);
  }

  function mergeCell(direction) {
    var found = htmlTableAt();
    if (!found || !found.cell) return note('put the caret in a cell first');

    var model = tableGrid(found.table);
    var at = cellCorner(model, found.cell);
    if (!at) return;

    var cell = found.cell;
    var across = cell.colSpan || 1;
    var down = cell.rowSpan || 1;
    var next = direction === 'right'
      ? (model.grid[at.row] || [])[at.column + across]
      : (model.grid[at.row + down] || [])[at.column];

    if (!next || next === cell) return note('there is nothing to merge with');

    /* only squares of the same shape can join and stay a rectangle */
    if (direction === 'right' && (next.rowSpan || 1) !== down) {
      return note('those two do not line up');
    }
    if (direction === 'down' && (next.colSpan || 1) !== across) {
      return note('those two do not line up');
    }

    var text = next.innerHTML.trim();
    if (text) cell.innerHTML = cell.innerHTML.trim() + ' ' + text;

    if (direction === 'right') cell.colSpan = across + (next.colSpan || 1);
    else cell.rowSpan = down + (next.rowSpan || 1);

    next.parentNode.removeChild(next);
    writeHtmlTable(found, found.table, cell);
  }

  function unmergeCell() {
    var found = htmlTableAt();
    if (!found || !found.cell) return note('put the caret in a cell first');

    var cell = found.cell;
    var across = cell.colSpan || 1;
    var down = cell.rowSpan || 1;
    if (across === 1 && down === 1) return note('that cell is not merged');

    var model = tableGrid(found.table);
    var at = cellCorner(model, found.cell);
    var tag = cell.tagName.toLowerCase();

    cell.removeAttribute('colspan');
    cell.removeAttribute('rowspan');

    /* put back a plain cell for every square the merge had swallowed */
    for (var i = 0; i < down; i++) {
      var row = model.rows[at.row + i];
      if (!row) continue;
      for (var j = 0; j < across; j++) {
        if (i === 0 && j === 0) continue;
        var fresh = document.createElement(tag);
        var neighbour = (model.grid[at.row + i] || [])[at.column + j + 1];
        if (neighbour && neighbour.parentNode === row) row.insertBefore(fresh, neighbour);
        else row.appendChild(fresh);
      }
    }

    writeHtmlTable(found, found.table, cell);
  }

  /*
   * A rule on one edge of one cell — the thing .col-rules cannot do, since it
   * draws between every column for want of any way to name one. Here there is a
   * cell to hang a class on, so the line goes exactly where it is asked for.
   */
  var RULES = ['rule-top', 'rule-bottom', 'rule-left', 'rule-right'];

  function toggleCellRule(name) {
    var found = htmlTableAt();
    if (!found || !found.cell) return note('put the caret in a cell first');

    found.cell.classList.toggle(name);
    if (!found.cell.className) found.cell.removeAttribute('class');
    writeHtmlTable(found, found.table, found.cell);
  }

  /* Alignment is a style rather than a class, because that is what kramdown
     writes for |:---:| and the two have to agree. Pressing the one already on
     takes it off again, back to whatever the stylesheet says. */
  var ALIGN = {
    'align-left': ['textAlign', 'left'],
    'align-center': ['textAlign', 'center'],
    'align-right': ['textAlign', 'right'],
    'valign-top': ['verticalAlign', 'top'],
    'valign-middle': ['verticalAlign', 'middle'],
    'valign-bottom': ['verticalAlign', 'bottom']
  };

  function setCellAlign(key) {
    var found = htmlTableAt();
    if (!found || !found.cell) return note('put the caret in a cell first');

    var how = ALIGN[key];
    var cell = found.cell;
    cell.style[how[0]] = cell.style[how[0]] === how[1] ? '' : how[1];
    if (!cell.getAttribute('style')) cell.removeAttribute('style');
    writeHtmlTable(found, found.table, cell);
  }

  function htmlRow(side, remove) {
    var found = htmlTableAt();
    if (!found || !found.cell) return note('put the caret in a cell first');

    var row = found.cell.parentNode;

    if (remove) {
      if (found.table.rows.length < 2) return note('the last row has to stay');
      var after = row.nextElementSibling || row.previousElementSibling;
      row.parentNode.removeChild(row);
      return writeHtmlTable(found, found.table, after && after.cells[0]);
    }

    var fresh = document.createElement('tr');
    var width = 0;
    [].forEach.call(row.cells, function (cell) { width += cell.colSpan || 1; });
    for (var i = 0; i < width; i++) fresh.appendChild(document.createElement('td'));

    row.parentNode.insertBefore(fresh, side === 'above' ? row : row.nextSibling);
    writeHtmlTable(found, found.table, fresh.cells[0]);
  }

  function toggleHtmlClass(name) {
    var found = htmlTableAt();
    if (!found) return;

    var had = found.table.classList.contains(name);
    found.table.classList.toggle(name, !had);
    if (!found.table.className) found.table.removeAttribute('class');
    writeHtmlTable(found, found.table, found.cell);
  }

  /*
   * In markdown the |:---:| row is the only place alignment can be said, and it
   * speaks for a whole column — there is no per-cell equivalent, which is what
   * the HTML side is for. Pressing the one already set clears it.
   */
  var COLUMN_ALIGN = {
    'col-align-left': 'left',
    'col-align-center': 'center',
    'col-align-right': 'right'
  };

  function ruleFor(align) {
    if (align === 'center') return ':---:';
    if (align === 'right') return '---:';
    if (align === 'left') return ':---';
    return '---';
  }

  function readAlign(cell) {
    var left = cell.charAt(0) === ':';
    var right = cell.charAt(cell.length - 1) === ':';
    return left && right ? 'center' : (right ? 'right' : (left ? 'left' : ''));
  }

  function markdownAlign() {
    var value = input.value;
    var range = blockAround(input.selectionStart);
    var lines = value.slice(range.from, range.to).split('\n');
    var lineStart = value.lastIndexOf('\n', input.selectionStart - 1) + 1;
    var column = caretColumn(value, lineStart);

    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim().charAt(0) !== '|') continue;
      var cells = splitRow(lines[i]);
      if (isRule(cells)) return readAlign(cells[column] || '');
    }
    return null;
  }

  function setColumnAlign(key) {
    var wanted = COLUMN_ALIGN[key];

    withTable(function (rows, column) {
      var rule = null;
      rows.forEach(function (cells) {
        if (Array.isArray(cells) && isRule(cells)) rule = cells;
      });
      if (!rule) return note('this table has no |:---:| row');

      var now = readAlign(rule[column] || '');
      rule[column] = ruleFor(now === wanted ? '' : wanted);
    }, true);
  }

  function cutColumn() {
    withTable(function (rows, column) {
      var width = 0;
      rows.forEach(function (cells) {
        if (Array.isArray(cells)) width = Math.max(width, cells.length);
      });
      if (width < 2) return note('a table needs a column');

      rows.forEach(function (cells) {
        if (Array.isArray(cells)) cells.splice(column, 1);
      });
    }, true);
  }

  function cutRow() {
    withTable(function (rows, column, line) {
      var cells = rows[line];
      if (!Array.isArray(cells) || isRule(cells)) return note('that is not a row');

      var first = rows.findIndex(Array.isArray);
      if (line === first) return note('the header row has to stay');

      rows.splice(line, 1);
    }, true);
  }

  function addRow(side) {
    withTable(function (rows, column, line) {
      var width = 0;
      rows.forEach(function (cells) {
        if (Array.isArray(cells)) width = Math.max(width, cells.length);
      });

      var blank = [];
      for (var i = 0; i < width; i++) blank.push('');

      /* never above the header or its rule — a row put there would be read as
         the header itself */
      var at = side === 'above' ? line : line + 1;
      var floor = rows.reduce(function (found, cells, index) {
        return Array.isArray(cells) && isRule(cells) ? index + 1 : found;
      }, 0);

      rows.splice(Math.max(at, floor), 0, blank);
    }, true);
  }

  /*
   * The two things you do to a table are only ever done to the table you are in,
   * so they ride beside it instead of sitting in the toolbar all day. The bar
   * appears at the table's first line and goes away as soon as the caret leaves.
   */
  var cellbar = document.querySelector('[data-editor-cellbar]');
  var tablebar = document.querySelector('[data-editor-tablebar]');
  var wideButton = tablebar && tablebar.querySelector('[data-snippet="full-width"]');

  /* park a bar just past the end of a line, and keep it inside the pane */
  function placeBar(bar, offset, nudge) {
    var at = measureCaret(offset);
    var host = bar.parentNode.getBoundingClientRect();
    bar.hidden = false;

    var top = at.top - at.lineHeight - host.top;
    var left = at.left - host.left + 12 + (nudge || 0);
    top = Math.max(4, Math.min(host.height - bar.offsetHeight - 4, top));
    left = Math.max(4, Math.min(host.width - bar.offsetWidth - 12, left));

    bar.style.top = top + 'px';
    bar.style.left = left + 'px';
    return { top: top, left: left, width: bar.offsetWidth, height: bar.offsetHeight };
  }

  function overlaps(a, b) {
    return a.left < b.left + b.width && b.left < a.left + a.width &&
      a.top < b.top + b.height && b.top < a.top + a.height;
  }

  function syncRowbar() {
    if (!cellbar || !tablebar) return;

    var value = input.value;
    var range = blockAround(input.selectionStart);

    function lineEndAt(from) {
      var found = value.indexOf('\n', from);
      return found === -1 || found > range.to ? range.to : found;
    }

    var lineStart = value.lastIndexOf('\n', input.selectionStart - 1) + 1;
    var onRow = value.slice(lineStart, lineEndAt(lineStart)).trim().charAt(0) === '|';
    var isTable = value.slice(range.from, lineEndAt(range.from)).trim().charAt(0) === '|';

    var html = isTable ? null : htmlTableAt();
    if (!isTable && !html) {
      cellbar.hidden = true;
      tablebar.hidden = true;
      return;
    }

    [cellbar, tablebar].forEach(function (bar) { bar.classList.toggle('is-html', !!html); });
    if (html) onRow = !!html.cell;

    wideButton.setAttribute('aria-pressed', String(html
      ? /\bfull-width\b/.test(html.table.className)
      : /\{:(?![:/])[^}\n]*\.full-width/.test(value.slice(range.from, range.to))));

    RULES.forEach(function (name) {
      var button = cellbar.querySelector('[data-snippet="' + name + '"]');
      if (!button) return;
      button.setAttribute('aria-pressed',
        String(!!(html && html.cell && html.cell.classList.contains(name))));
    });

    var columnAlign = html ? null : markdownAlign();
    Object.keys(COLUMN_ALIGN).forEach(function (key) {
      var button = cellbar.querySelector('[data-snippet="' + key + '"]');
      if (button) button.setAttribute('aria-pressed', String(columnAlign === COLUMN_ALIGN[key]));
    });

    Object.keys(ALIGN).forEach(function (key) {
      var button = cellbar.querySelector('[data-snippet="' + key + '"]');
      if (!button) return;
      var how = ALIGN[key];
      button.setAttribute('aria-pressed',
        String(!!(html && html.cell && html.cell.style[how[0]] === how[1])));
    });

    /* cells: beside the row being edited. whole table: at its last line, which
       is where its IAL sits — the same place `wide` writes to. */
    var cell = null;
    cellbar.hidden = !onRow;
    if (onRow) cell = placeBar(cellbar, lineEndAt(lineStart));

    var last = placeBar(tablebar, range.to);

    /* the cell bar runs to two lines for an HTML table, so "same line" is not
       enough to tell whether they clash — compare the boxes */
    if (cell && overlaps(cell, last)) {
      last = placeBar(tablebar, range.to, cell.left + cell.width + 8 - last.left);
      if (overlaps(cell, last)) {
        tablebar.style.top = (cell.top + cell.height + 4) + 'px';
      }
    }
  }

  [cellbar, tablebar].forEach(function (bar) {
    if (!bar) return;
    ['keyup', 'click', 'scroll'].forEach(function (type) {
      input.addEventListener(type, syncRowbar, { passive: true });
    });
    input.addEventListener('blur', function () {
      /* a click on a bar itself must not close it before it runs */
      window.setTimeout(function () {
        if (bar.contains(document.activeElement)) return;
        if (document.activeElement === input) return;
        bar.hidden = true;
      }, 120);
    });
  });

  /*
   * kramdown attaches an IAL to the block directly above it, and a blank line in
   * between makes it vanish — so this walks down to the last line of the block
   * the caret is in and writes it there. If that block already carries an IAL,
   * the class joins it rather than starting a second one.
   */
  function applyIal(className, onlyTables) {
    var value = input.value;
    var IAL = /^\{:(?![:/])[ \t]*([^}]*)\}/;

    function lineEnd(at) {
      var found = value.indexOf('\n', at);
      return found === -1 ? value.length : found;
    }

    var start = value.lastIndexOf('\n', input.selectionEnd - 1) + 1;
    var end;

    if (IAL.test(value.slice(start, lineEnd(start)))) {
      /* the caret is on the block's IAL already — writing another below it would
         attach to nothing, which is where a second press used to land */
      end = start - 1;
    } else {
      end = lineEnd(input.selectionEnd);
      while (end < value.length) {
        var next = lineEnd(end + 1);
        var line = value.slice(end + 1, next);
        if (!line.trim() || IAL.test(line)) break;
        end = next;
      }
    }

    /* .full-width means nothing anywhere else, so say so rather than quietly
       hanging a class on a paragraph */
    if (onlyTables) {
      var lastLine = value.slice(value.lastIndexOf('\n', end - 1) + 1, end);
      if (lastLine.trim().charAt(0) !== '|') {
        return note('put the caret in a table first');
      }
    }

    var after = value.slice(end + 1, lineEnd(end + 1));
    var existing = IAL.exec(after);

    if (!existing) return insertAt(end, end, '\n{: .' + className + ' }');

    /* pressing it again takes the class off, and takes the whole line with it if
       that was all it held */
    var rest = existing[1].split(/\s+/).filter(function (part) { return part; });
    var had = rest.indexOf('.' + className);

    if (had !== -1) {
      rest.splice(had, 1);
      if (!rest.length) return insertAt(end, end + 1 + existing[0].length, '');
      return insertAt(end + 1, end + 1 + existing[0].length,
        '{: ' + rest.join(' ') + ' }');
    }

    rest.push('.' + className);
    insertAt(end + 1, end + 1 + existing[0].length, '{: ' + rest.join(' ') + ' }');
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
    /* the same three buttons serve both kinds of table; which one the caret is
       in decides what they do */
    var html = htmlTableAt();

    if (key === 'full-width') return html ? toggleHtmlClass('full-width') : applyIal('full-width', true);
    if (key === 'tidy-table') return html ? writeHtmlTable(html, html.table, html.cell) : tidyTable();
    if (key === 'row-above') return html ? htmlRow('above') : addRow('above');
    if (key === 'row-below') return html ? htmlRow('below') : addRow('below');
    if (key === 'row-cut') return html ? htmlRow(null, true) : cutRow();

    if (key === 'col-left') return addColumn('left');
    if (key === 'col-right') return addColumn('right');
    if (key === 'col-cut') return cutColumn();
    if (COLUMN_ALIGN[key]) return setColumnAlign(key);
    if (key === 'to-html') return tableToHtml();

    if (key === 'merge-right') return mergeCell('right');
    if (key === 'merge-down') return mergeCell('down');
    if (key === 'unmerge') return unmergeCell();
    if (RULES.indexOf(key) !== -1) return toggleCellRule(key);
    if (ALIGN[key]) return setCellAlign(key);

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
  /* Safari only grew String.normalize late enough to be worth guarding. */
  function normalise(text) {
    return text && text.normalize ? text.normalize('NFC') : text;
  }

  var sitemap = [];
  try {
    sitemap = JSON.parse(document.querySelector('[data-editor-sitemap]').textContent);
    /*
     * GitHub Pages serves foo.html at /foo — link to the tidier form.
     *
     * Each entry also gets a key to search against, and that key is normalised:
     * a Korean file name comes off a Mac's disk decomposed, so "논문" there is
     * three jamo where the same word typed at the keyboard is one syllable, and
     * a plain string search between the two never matches. The url is decoded
     * into the key as well, so a path can be searched in Korean too — but the
     * url itself is left exactly as the file is named, since that is what has
     * to survive into the link.
     */
    sitemap.forEach(function (item) {
      item.u = item.u.replace(/\.html$/, '');
      item.t = normalise(item.t);

      var path = item.u;
      try { path = decodeURIComponent(item.u); } catch (e) {}
      item.key = normalise(item.t + ' ' + path).toLowerCase();
    });
  } catch (e) {}

  var completeBox = document.querySelector('[data-editor-complete]');
  var completeState = null;

  function measureCaret(offset) {
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
    mirror.textContent = input.value.slice(0,
      offset === undefined ? input.selectionStart : offset);

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
    var needle = normalise(query).toLowerCase();
    var hits = sitemap.filter(function (item) {
      return item.key.indexOf(needle) !== -1;
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

  /* The named bars from _data/nav/, baked in by the layout. */
  var navSets = {};
  try {
    navSets = JSON.parse(document.querySelector('[data-editor-navs]').textContent) || {};
  } catch (e) {}

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

        /* `nav: main` names a bar; a bare `nav:` opens a list written out below.
           page-chrome.html reads `true` as `main`, so this does too. */
        if (inNav) {
          var named = unquote(top[2]);
          if (named === 'true') named = 'main';
          if (named) meta.nav = navSets[named] || [];
        }

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
  function tightenLists(html, ials) {
    var slate = document.createElement('template');
    slate.innerHTML = html;

    slate.content.querySelectorAll('li > p:first-child').forEach(function (p) {
      var after = p.nextElementSibling;
      if (!after || (after.tagName !== 'UL' && after.tagName !== 'OL')) return;
      while (p.firstChild) p.parentNode.insertBefore(p.firstChild, p);
      p.parentNode.removeChild(p);
    });

    /*
     * marked writes a table's alignment as the old align="" attribute, kramdown
     * as an inline style. A presentational attribute loses to any stylesheet
     * rule, and latex.css has `th, td { text-align: left }` — so the preview
     * ignored the |:---:| row while the published page did not.
     */
    slate.content.querySelectorAll('th[align], td[align]').forEach(function (cell) {
      cell.style.textAlign = cell.getAttribute('align');
      cell.removeAttribute('align');
    });

    /* the same pass, so an IAL costs no extra parse of the document */
    if (ials && ials.length) {
      var walker = document.createTreeWalker(slate.content, NodeFilter.SHOW_COMMENT);
      var marks = [];
      while (walker.nextNode()) marks.push(walker.currentNode);

      marks.forEach(function (mark) {
        var found = /^ial(\d+)$/.exec(mark.nodeValue.trim());
        if (!found) return;
        var target = mark.previousElementSibling;
        mark.parentNode.removeChild(mark);
        if (target) applyIals(target, ials[Number(found[1])]);
      });
    }

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

  /*
   * kramdown's block IAL: a line holding nothing but {: .cls #id key="v" } right
   * after a block hangs those attributes on it. marked has never heard of it and
   * would print the braces, so the line becomes an HTML comment now and the
   * attributes are put on the element after parsing.
   *
   * {::nomarkdown} and {:/} start with two colons or a slash, and are left alone.
   * A line like this inside a fenced code block would be taken for an IAL, which
   * kramdown would not do — the one place this is a likeness rather than a copy.
   */
  function extractIals(src) {
    var list = [];
    src = src.replace(/^\{:(?![:/])[ \t]*([^}\n]*)\}[ \t]*$/gm, function (m, attrs) {
      list.push(attrs);
      return '<!--ial' + (list.length - 1) + '-->';
    });
    return { src: src, list: list };
  }

  function applyIals(target, attrs) {
    attrs.replace(/([.#])([\w-]+)|([\w-]+)="([^"]*)"/g,
      function (m, sign, name, key, value) {
        if (sign === '.') target.classList.add(name);
        else if (sign === '#') target.id = name;
        else if (key) target.setAttribute(key, value);
        return '';
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
    var ials = extractIals(math.src);
    var notes = extractFootnotes(ials.src);
    var body = notes.src
      .replace(/\\{1,2}[ \t]*$/gm, '  ')
      .replace(/\{::nomarkdown\}/g, '')
      .replace(/\{:\/\}/g, '');

    var html = window.marked.parse(body, { gfm: true }) + footnoteSection(notes);
    return restoreMath(
      tightenLists(unwrapDisplay(html, math.store), ials.list), math.store);
  }

  /* The real pages grow a contents rail in the left margin; the preview builds
     one from the same markup so the same stylesheet lays it out. It is rebuilt
     only when the headings themselves change, so it does not blink on every
     keystroke — and the entries keep pointing at live heading elements. */
  var tocNav = null;
  var tocSig = null;

  function syncToc() {
    /* the same reading of a heading the real page uses, so a margin note hung on
       one does not turn up in the rail */
    var label = window.headingText || function (h) { return h.textContent.trim(); };

    var headings = [].filter.call(render.querySelectorAll('h2, h3'), function (h) {
      return label(h);
    });
    if (headings.length < 2) headings = [];

    var sig = headings.map(function (h) { return h.tagName + label(h); }).join('\u0000');
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
      link.textContent = label(heading);
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

  /* ---------- preview back to source ---------- */

  /*
   * Double-click a word in the preview and the caret goes to it in the markdown.
   *
   * There is no map from rendered text back to source — marked does not keep one
   * and the source is preprocessed before it even gets there. So the word is
   * looked up by *which* occurrence it is: count how many times it appears in the
   * preview above the click, then take that same occurrence in the markdown. A
   * word repeated twenty times still lands on the right one; only text the
   * markdown spells differently (a link's label, say) can miss, and then it falls
   * back to the first match.
   *
   * Only dblclick, never a plain drag — a drag across the preview is usually
   * someone copying, and stealing focus would drop their selection.
   */
  function countBefore(haystack, needle) {
    var n = 0;
    var at = haystack.indexOf(needle);
    while (at !== -1) { n++; at = haystack.indexOf(needle, at + needle.length); }
    return n;
  }

  function nthIndexOf(haystack, needle, n) {
    var at = haystack.indexOf(needle);
    while (n > 0 && at !== -1) { at = haystack.indexOf(needle, at + needle.length); n--; }
    return at;
  }

  /* Chrome does not always scroll a textarea to a selection it was given, and
     when it does it puts the line at the very edge. Place it a third down. */
  function showCaret(pos) {
    var line = input.value.slice(0, pos).split('\n').length - 1;
    var lineHeight = parseFloat(getComputedStyle(input).lineHeight) || 20;
    var target = line * lineHeight - input.clientHeight / 3;
    input.scrollTop = Math.max(0, target);
  }

  preview.addEventListener('dblclick', function (event) {
    var selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    var anchor = selection.anchorNode;
    if (!anchor || !render.contains(anchor)) return;
    if (tocNav && tocNav.contains(anchor)) return; /* the rail scrolls, it does not edit */

    var needle = selection.toString().trim();
    var nth = 0;

    /* A formula renders as glyphs that appear nowhere in the markdown, but KaTeX
       keeps the TeX it was given in the MathML — search for that instead. */
    var host = anchor.parentElement && anchor.parentElement.closest('.katex');
    if (host) {
      var tex = host.querySelector('annotation[encoding="application/x-tex"]');
      if (!tex) return;
      needle = tex.textContent.trim();
    } else {
      if (needle.length < 2) return;
      var range = document.createRange();
      range.selectNodeContents(render);
      if (tocNav) range.setStartAfter(tocNav);
      try {
        range.setEnd(selection.anchorNode, selection.anchorOffset);
      } catch (e) {
        return;
      }
      nth = countBefore(range.toString(), needle);
    }

    var pos = nthIndexOf(input.value, needle, nth);
    if (pos === -1) pos = input.value.indexOf(needle);
    if (pos === -1) return note('the markdown does not spell that the same way');

    input.focus();
    input.setSelectionRange(pos, pos + needle.length);
    showCaret(pos);
  });

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
    return node.nodeType === 1 ? node.outerHTML : 'text:' + node.nodeValue;
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
    syncRowbar();
    try {
      localStorage.setItem(DRAFT_KEY, input.value);
    } catch (e) {
      note('Could not save in this browser — download the file to keep it');
    }
  }

  var HINT = '[[ or \u2318K / Ctrl+K searches this site for a link \u00b7 ' +
    'double-click the preview to jump to that line \u00b7 drag the seam to resize';

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

  /*
   * Tab indents instead of leaving the editor — unless the search is open.
   *
   * With nothing selected it types two spaces. With a selection, or with shift
   * held, it works on whole lines: every line the selection touches moves in or
   * out together, which is what nested lists and indented code need. Two spaces,
   * because that is the nesting step markdown itself uses.
   */
  var INDENT = '  ';

  input.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab' || completeState) return;
    event.preventDefault();

    var value = input.value;
    var sel = selection();

    if (sel.start === sel.end && !event.shiftKey) {
      insertAt(sel.start, sel.end, INDENT);
      return;
    }

    /* Selecting down to the next line leaves the caret at that line's start; it
       should not drag a line nobody meant to touch. */
    var last = sel.end;
    if (last > sel.start && value.charAt(last - 1) === '\n') last--;

    var from = value.lastIndexOf('\n', sel.start - 1) + 1;
    var to = value.indexOf('\n', last);
    if (to === -1) to = value.length;

    var lines = value.slice(from, to).split('\n');
    var moved = lines.map(function (line) {
      return event.shiftKey ? line.replace(/^(\t| {1,2})/, '') : INDENT + line;
    });
    var text = moved.join('\n');
    if (text === lines.join('\n')) return; /* already flush left */

    if (sel.start === sel.end) {
      /* keep the caret where it was in the line, not on the whole line */
      var shift = moved[0].length - lines[0].length;
      var caret = Math.max(from, sel.start + shift);
      insertAt(from, to, text, caret, caret);
      return;
    }

    insertAt(from, to, text, from, from + text.length);
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
    }).map(function (html) {
      /* one wrapper per logical line, so the gutter can ask each how many rows
         it wrapped onto — the <pre> is the only thing that wraps exactly as the
         textarea does, so it is the only honest place to measure */
      return '<span class="ln">' + (html === '' ? '\u200b' : html) + '</span>';
    }).join('\n');
  }

  /* ---------- line numbers ---------- */

  /*
   * A number per logical line, at the top of however many rows that line takes.
   *
   * How many rows is read from where the next line begins, not from counting
   * the line's own boxes: a line ending in a space gets an extra empty box that
   * takes up no room, and counting boxes put the numbers a row out from there
   * on. Advance between lines is what the numbers have to follow, so that is
   * what is measured.
   *
   * Every line therefore needs a box to measure — hence the zero-width space in
   * an otherwise empty one, which changes nothing on screen.
   */
  var gutter = document.querySelector('[data-editor-gutter]');
  var gutterRows = [];

  function syncGutter() {
    if (!gutter) return;

    var spans = codeLayer.querySelectorAll('.ln');
    if (!spans.length) return;

    /* Each number is placed at its own line's offset rather than stacked on the
       heights of the ones above it. Stacking means one bad measurement moves
       every number below it; placing them independently means a line that
       cannot be measured costs only itself. */
    var lineHeight = parseFloat(getComputedStyle(codeLayer).lineHeight) || 20;
    var origin = codeLayer.getBoundingClientRect().top - codeLayer.scrollTop;

    /*
     * A span's client rect is its glyph box, which sits half the leading below
     * the top of the line box it lives on. The number is drawn in a line box of
     * its own, so it has to be placed at the *line box* top for the two to end
     * up on the same baseline — otherwise every number rides a few pixels high.
     */
    var last = 0;
    var tops = [].map.call(spans, function (span, i) {
      var rect = span.getClientRects()[0];
      if (!rect) {
        last += i ? lineHeight : 0;
        return Math.round(last);
      }
      var lead = (lineHeight - rect.height) / 2;
      last = rect.top - lead - origin;
      return Math.round(last);
    });

    var same = tops.length === gutterRows.length && tops.every(function (n, i) {
      return n === gutterRows[i];
    });
    if (same) return;
    gutterRows = tops;

    gutter.innerHTML = '<div data-gutter-inner>' + tops.map(function (top, i) {
      return '<div style="top:' + top + 'px"><span>' + (i + 1) + '</span></div>';
    }).join('') + '</div>';
    trackGutter();
  }

  /*
   * The numbers are moved rather than scrolled. A scrollport can only travel as
   * far as its own content, and the gutter's is shorter than the textarea's by
   * its bottom padding — so at the end of a long note the numbers would stop
   * while the text kept going, and the two drifted apart.
   */
  function trackGutter() {
    if (!gutter) return;
    var inner = gutter.firstElementChild;
    if (inner) inner.style.transform = 'translateY(' + (-input.scrollTop) + 'px)';
  }

  function repaint() {
    /* the trailing newline keeps the last line's height in the <pre> */
    codeLayer.innerHTML = paint(input.value) + '\n';
    codeLayer.scrollTop = input.scrollTop;
    codeLayer.scrollLeft = input.scrollLeft;
    syncGutter();
  }

  input.addEventListener('scroll', function () {
    codeLayer.scrollTop = input.scrollTop;
    codeLayer.scrollLeft = input.scrollLeft;
    trackGutter();
  }, { passive: true });

  /*
   * A narrower pane rewraps every line, so the row counts all have to go. The
   * pane changes width without the window doing so — dragging the seam, the
   * split, a device preview — so watch the box itself rather than the window.
   */
  if (window.ResizeObserver && gutter) {
    new ResizeObserver(function () {
      gutterRows = [];
      syncGutter();
    }).observe(gutter.parentNode);
  }

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
