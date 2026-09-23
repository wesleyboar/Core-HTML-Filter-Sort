# TACC: HTML Filter-Sort

Filterable, sortable HTML tables and filterable native accordions (`<details>`) powered by [List.js](https://listjs.com/) — optimized for [TACC/Core-CMS](https://github.com/TACC/Core-CMS) pages.

## Usage

### via CDN

E.g. [JSDelivr](https://www.jsdelivr.com/):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tacc/html-filter-sort@0/src/filtersort.css" />
<script src="https://cdn.jsdelivr.net/npm/list.js-fixed@2/dist/list.min.js" crossorigin="anonymous">/* List.js (required global dependency for @tacc/html-filter-sort) */</script>
<script type="module">
  import filtersort from 'https://cdn.jsdelivr.net/npm/@tacc/html-filter-sort@0/src/filtersort.js';
  filtersort();
</script>
```

> **Note:**
> During pre-release, use commit SHA URLs instead of version tags:
> ```
> https://cdn.jsdelivr.net/gh/wesleyboar/filter-sort@__SHA__/src/filtersort.js
> ```

### Supported Markup

#### Tables

Add `class="js-filtersort"` to any `<table>`. A `<thead>` with column headers and a `<tbody>` are required.

```html
<table class="js-filtersort">
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

When filtering or searching leaves no rows, a `<tr>` spanning all columns is added automatically, reading its text from `data-filtersort-empty-text` (default: `"No results found"`).

```html
<table class="js-filtersort" data-filtersort-empty-text="No stations match your filters">
  …
</table>
```

See the [working table example](examples/tables.html).

#### Accordions

Add `class="js-filtersort-accordion"` and an `id` to a container, with a direct `.js-list` child containing only `<details>` elements. Add `data-filtersort-search` to generate a search field. The search checks both the `<summary>` and the accordion body, including text in closed accordions.

To generate checkbox facets, place hidden markers inside each `<details>`. `data-filtersort-facet` names the checkbox group; `data-filtersort-value` names an option. A details item can have multiple values in the same group. Checked values within a group match **any** value; different groups must **all** match. The accordions retain their native open state while filtering.

```html
<div id="resources" class="js-filtersort-accordion" data-filtersort-search>
  <div class="js-list">
    <details>
      <summary>GPU cluster</summary>
      <span hidden data-filtersort-facet="Resource Type" data-filtersort-value="GPU Compute"></span>
      <span hidden data-filtersort-facet="Status" data-filtersort-value="Active"></span>
      <p>Accelerated compute for AI model training.</p>
    </details>
    <details>
      <summary>Cloud platform</summary>
      <span hidden data-filtersort-facet="Resource Type" data-filtersort-value="Cloud"></span>
      <span hidden data-filtersort-facet="Status" data-filtersort-value="Active"></span>
      <p>Cloud services for research projects.</p>
    </details>
  </div>
</div>
```

The filter controls, reset button, result count, and empty message are generated automatically. Customize the empty message with `data-filtersort-empty-text` on the container. List.js filters whole `<details>` elements, so a matching accordion's `<summary>` and body stay together. See the [working accordion example](examples/accordions.html).

### Filter UI

#### Tables

To auto-build a filter bar above a table, add `id` and filter attributes to the table:

- `data-filtersort-search` — include a search input (boolean presence attribute)
- `data-filtersort-select-cols-via-child` — comma-separated column numbers, one select filter per number; each **child element** of a cell is a value.
- `data-filtersort-select-cols-via-comma` — comma-separated column numbers, one select filter per number; each **comma-separated value** of a cell is a value.

```html
<table id="my-table" class="js-filtersort"
  data-filtersort-search
  data-filtersort-select-cols-via-child="1,3"
  data-filtersort-select-cols-via-comma="4">
  …
</table>
```

> **Note:**
> `data-filtersort-select-cols-via-child="1"` creates a select filter for the **1st** column, `"2"` for the **2nd**, _et cetera_. Select filter labels are auto-derived from `<th>` text. The filter markup is self-injected by `filtersort.js` on first call (no extra manual HTML required).

If a `data-filtersort-select-cols-via-child` cell can hold more than one category (e.g. a "Category" column), wrap each category in its own child element, such as a `<p>` or `<span>`. Each child element becomes a separate, exact-text filter option — so a category name may safely contain a comma.

```html
<td>
  <span>Software, Algorithms &amp; Something</span>
</td>
<td>
  <span>Acategory</span>
  <span>Bcategory</span>
</td>
```

> **Note:**
> A cell with zero or one child element is treated as a single category using its whole text (same as a plain `<td>Active</td>`).

If a `data-filtersort-select-cols-via-comma` cell can hold more than one category (e.g. a "Tags" column), separate them with a comma instead — no wrapper elements needed. Use this only when a category name never itself contains a comma.

```html
<td>Cyberinfrastructure, Open Science, Reproducibility</td>
```

#### Accordions

To auto-build a filter bar above an accordion list, add `id` and filter attributes to the container and its `<details>` items:

- `data-filtersort-search` — include a search input (boolean presence attribute on the container)
- `data-filtersort-facet` — name a checkbox group (on a hidden child element of `<details>`)
- `data-filtersort-value` — name a checkbox option (on the same child element)

```html
<div id="resources" class="js-filtersort-accordion" data-filtersort-search>
  <div class="js-list">
    <details>
      <summary>GPU cluster</summary>
      <span hidden data-filtersort-facet="Resource Type" data-filtersort-value="GPU Compute"></span>
      …
    </details>
  </div>
</div>
```

### URL-Driven Category Selection

#### Tables

A page can pre-select a category filter via the URL:

- `#Category Name` — hash fragment (takes precedence when both are present)\
    <sup>supports special characters: `#Category, Name & Ampersand`</sup>
- `?category=Category Name` — query parameter (used only if there's no hash)\
    <sup>supports special characters: `?category=Category, Name %26 Ampersand`</sup>

The identifier is URL-decoded (so `%20` becomes a space, supporting multi-word categories) then matched **exactly** against each select filter's option text; every select filter across every table with a matching option gets set. The page also reacts to in-page hash changes (`hashchange`/`popstate`) without a reload.

#### Accordions

URL-driven category selection is not supported for accordions yet. The hash and `?category=` parameter do not preselect accordion checkboxes or search text.

### `filtersort()` Options

| Option | Default | Description |
|---|---|---|
| `scopeElement` | `document` | Root element to search for supported markup |
| `tableSelector` | `table.js-filtersort` | CSS selector for target tables |
| `accordionSelector` | `.js-filtersort-accordion` | CSS selector for target accordion containers |
| `notSortableSelector` | `th.not-filtersort` | Columns matching this are excluded |
| `buttonClass` | `''` | Extra class(es) on sort `<button>` elements (e.g. `'btn btn-link'`) |

## Third-Party Skin Support

### [TACC/Core-Styles](https://github.com/TACC/Core-Styles) v2+
- `--global-font-size--small`
- `.c-button--as-link`
- [Bootstrap](https://getbootstrap.com/) `.btn-link`

## Requirements

- A global `window.List` instance (≥ version 2) must be loaded before `filtersort()` is called. Use:
    - **either** [`list.js-fixed`](https://www.npmjs.com/package/list.js-fixed) ([to fix bug with punctuation in search](https://github.com/javve/list.js/issues/699))
    - **or** [`list.js`](https://www.npmjs.com/package/list.js) if user need not search punctuation
