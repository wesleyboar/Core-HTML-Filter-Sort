# `@tacc/sort-table`

Sortable, filterable HTML tables powered by [List.js](https://listjs.com/) — for TACC CMS pages.

## Usage

### via CDN

E.g. [JSDelivr](https://www.jsdelivr.com/):

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tacc/sort-table@0.1.0/src/sortableTable.css" />

<!-- List.js (required global dependency) -->
<script src="https://cdn.jsdelivr.net/npm/list.js@2.3.1/dist/list.min.js" crossorigin="anonymous"></script>

<!-- JS -->
<script type="module">
  import sortableTable from 'https://cdn.jsdelivr.net/npm/@tacc/sort-table@0.1.0/src/sortableTable.js';
  sortableTable();
</script>
```

> [!NOTE]
> During pre-release, use commit SHA URLs instead of version tags:
> ```
> https://cdn.jsdelivr.net/gh/wesleyboar/sort-table@__SHA__/src/sortableTable.js
> ```

### Table Markup

Add `class="js-sortable"` to any `<table>`. A `<thead>` with column headers and a `<tbody>` are required.

```html
<table class="js-sortable">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Frontera</td><td>Active</td></tr>
    <tr><td>Stampede3</td><td>Active</td></tr>
  </tbody>
</table>
```

### Filter UI

To auto-build a filter bar above a table, add `id` and filter attributes to the table:

- `data-sortable-search` — include a search input (boolean presence attribute)
- `data-sortable-select-cols` — comma-separated 1-based column numbers, one select filter per number

```html
<table id="my-table" class="js-sortable"
  data-sortable-search
  data-sortable-select-cols="1,3">
  …
</table>
```

> [!NOTE]
> `data-sortable-select-cols="1"` creates a select filter for the 1st column, `"2"` for the 2nd, _et cetera_. Select filter labels are auto-derived from `<th>` text. The filter `<template>` is self-injected by `sortableTable.js` on first call — no extra HTML required.

### `sortableTable()` Options

| Option | Default | Description |
|---|---|---|
| `scopeElement` | `document` | Root element to search for tables |
| `tableSelector` | `table.js-sortable` | CSS selector for target tables |
| `notSortableSelector` | `th.not-sortable` | Columns matching this are excluded |
| `buttonClass` | `''` | Extra class(es) on sort `<button>` elements (e.g. `'btn btn-link'`) |

## Third-Party Skin Support

`sortableTable.css` includes styles for:

- **[TACC Core-Styles v2](https://github.com/TACC/Core-Styles)** e.g. `--global-font-size--small`, `.c-button--as-link`, `.icon.icon-…`.
- **[Bootstrap](https://getbootstrap.com/) v4+:** e.g. `.btn.btn-link`.

The table sorts and filters correctly without either library.

## Requirements

- `list.js` ≥2 must be loaded as `window.List` before `sortableTable()` is called.
