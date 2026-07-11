import { FILTER_TEMPLATE_HTML } from './filtersort.html.js';

const SORT_TABLE_CLASS = 'js-filtersort';
const FILTER_CLASS = 'js-filtersort-filter';
const FILTER_LIST_CLASS = 'js-filtersort-form';
const OUTPUT_CLASS = 'js-filtersort-total';
const DEPEND_LIST_CLASS = 'js-list';
const DEPEND_BUTTON_CLASS = 'js-sort';

const DEFAULT_TABLE_SELECTOR = 'table.' + SORT_TABLE_CLASS;
const NOT_SORTABLE_SELECTOR = 'th.not-filtersort';

const FILTER_TEMPLATE_ID = 'filtersort-form';
const FILTER_SEARCH_LABEL_SELECTOR = 'label:has(input[type="search"])';
const FILTER_SELECT_LABEL_SELECTOR = 'label:has(select)';

let listJsMissingLogged = false;

/**
 * @typedef {FilterSpecForSearch | FilterSpecForSelect} FilterSpec
 * @typedef {{ type: 'search' }} FilterSpecForSearch
 * @typedef {{ type: 'select', column: number }} FilterSpecForSelect - column is 1-based
 */

/**
 * @param {string} tableId
 * @param {ParentNode} scopeElement
 * @returns {NodeListOf<Element>}
 */
function findFilterControls(tableId, scopeElement) {
  return scopeElement.querySelectorAll(
    '.' + FILTER_CLASS + '[aria-controls="' + CSS.escape(tableId) + '"]'
  );
}

/**
 * @param {HTMLInputElement | HTMLSelectElement} control
 * @param {string} tableId
 */
function registerFilterControl(control, tableId) {
  control.classList.add(FILTER_CLASS);
  control.setAttribute('aria-controls', tableId);
}

/**
 * @param {HTMLTableElement} table
 * @returns {FilterSpec[] | null}
 */
function readFilterAttrs(table) {
  const specs = [];

  if (table.hasAttribute('data-filtersort-search')) {
    specs.push({ type: 'search' });
  }

  const selectCols = table.getAttribute('data-filtersort-select-cols');
  if (selectCols) {
    for (const raw of selectCols.split(',')) {
      const col = parseInt(raw.trim(), 10);
      if (!isNaN(col) && col > 0) {
        specs.push({ type: 'select', column: col });
      }
    }
  }

  return specs.length ? specs : null;
}

/**
 * @param {HTMLElement} caption
 * @param {HTMLTableElement} table
 * @param {FilterSpecForSelect} spec
 */
function setSelectFilterCaption(caption, table, spec) {
  const columnIndex = spec.column - 1;
  const textFallback = spec.label ?? `Column ${spec.column}`;
  const cell = table.tHead?.rows[0]?.cells[columnIndex];

  if (cell instanceof HTMLTableCellElement && cell.textContent?.trim()) {
    caption.replaceChildren(
      ...Array.from(cell.childNodes, (node) => node.cloneNode(true))
    );
    return;
  }
  caption.textContent = textFallback;
}

/**
 * Puts `<option>` text in A–Z order (browser locale, case-insensitive).
 *
 * @param {string[]} optionTexts
 */
function sortSelectOptions(optionTexts) {
  optionTexts.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

/**
 * @param {HTMLTableElement} table
 * @param {number} columnIndex
 * @returns {string[]}
 */
function collectSelectOptions(table, columnIndex) {
  const tbody = table.tBodies[0];
  if (!tbody) {
    return [];
  }
  const seen = new Set();
  /** @type {string[]} */
  const options = [];

  for (const row of tbody.rows) {
    const cell = row.cells[columnIndex];
    warnIfRowCellMissing(table, cell);

    const optionsFromCellText = getCellText(cell)
      .split(',')
      .map((piece) => piece.trim())
      .filter(Boolean);

    for (const optionText of optionsFromCellText) {
      if (seen.has(optionText)) {
        continue;
      }
      seen.add(optionText);
      options.push(optionText);
    }
  }

  sortSelectOptions(options);
  return options;
}

/**
 * @param {string} tableId
 * @param {string} key
 * @returns {string}
 */
function getFilterControlId(tableId, key) {
  return `${tableId}-filter-${key}`;
}

/**
 * @param {string} templateId
 * @returns {DocumentFragment}
 */
function clonePageTemplate(templateId) {
  const template = document.getElementById(templateId);

  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(
      '[filtersort] Missing <template id="' + templateId + '">.'
    );
  }

  return template.content.cloneNode(true);
}

/**
 * @param {HTMLLabelElement} searchLabel
 * @param {string} tableId
 * @returns {string} control id
 */
function wireSearchFilterLabel(searchLabel, tableId) {
  const input = searchLabel.querySelector('input[type="search"]');
  const controlId = getFilterControlId(tableId, 'search');

  searchLabel.htmlFor = controlId;
  input.id = controlId;
  registerFilterControl(input, tableId);

  return controlId;
}

/**
 * @param {HTMLLabelElement} label
 * @param {HTMLTableElement} table
 * @param {FilterSpecForSelect} spec
 * @returns {string} control id
 */
function wireSelectFilterLabel(label, table, spec) {
  const caption = label.querySelector('.filtersort__label');
  const select = label.querySelector('select.filtersort__input');
  const controlId = getFilterControlId(table.id, `col-${spec.column}`);

  label.htmlFor = controlId;
  setSelectFilterCaption(caption, table, spec);
  select.id = controlId;
  registerFilterControl(select, table.id);

  for (const optionText of collectSelectOptions(table, spec.column - 1)) {
    const option = document.createElement('option');
    option.textContent = optionText;
    select.append(option);
  }

  return controlId;
}

/**
 * @param {HTMLTableElement} table
 * @param {FilterSpec[]} specs
 * @param {string} searchIconClass
 * @param {string} countClass
 * @returns {HTMLFieldSetElement}
 */
function buildFilterFieldset(table, specs, searchIconClass, countClass) {
  const fragment = clonePageTemplate(FILTER_TEMPLATE_ID);
  const fieldset = /** @type {HTMLFieldSetElement} */ (
    fragment.querySelector('fieldset')
  );

  if (searchIconClass) {
    fieldset.querySelector('.filtersort__icon')
      ?.classList.add(...searchIconClass.split(' ').filter(Boolean));
  }
  if (countClass) {
    fieldset.querySelector('output.' + OUTPUT_CLASS)
      ?.classList.add(...countClass.split(' ').filter(Boolean));
  }

  const searchSpec = specs.find((spec) => spec.type === 'search');
  const selectSpecs = specs.filter((spec) => spec.type === 'select');

  const searchField = fieldset.querySelector(FILTER_SEARCH_LABEL_SELECTOR);
  const selectField = fieldset.querySelector(FILTER_SELECT_LABEL_SELECTOR);
  const filterControlIds = [];

  /* buildSearchField */
  if (searchSpec) {
    filterControlIds.push(
      wireSearchFilterLabel(searchField, table.id)
    );
  } else {
    searchField.remove();
  }

  /* buildSelectField */
  for (const spec of selectSpecs) {
    const newSelectField = selectField.cloneNode(true);
    filterControlIds.push(
      wireSelectFilterLabel(newSelectField, table, spec)
    );
    fieldset.append(newSelectField);
  }
  selectField.remove();

  /* buildOutputField */
  if (searchSpec) {
    const output = fieldset.querySelector('output.' + OUTPUT_CLASS);
    output.setAttribute('for', filterControlIds.join(' '));
  }

  return fieldset;
}

/**
 * @param {HTMLTableElement} table
 * @param {string} searchIconClass
 * @param {string} countClass
 */
function buildFilters(table, searchIconClass, countClass) {
  const specs = readFilterAttrs(table);
  if (!specs) {
    return;
  }
  if (!table.id) {
    console.warn(
      '[filtersort] Filter attributes require a table id; skipping filter UI.',
      table
    );
    return;
  }

  const fieldset = buildFilterFieldset(table, specs, searchIconClass, countClass);

  table.parentNode?.insertBefore(fieldset, table);
}

/**
 * @param {HTMLTableElement} table
 * @param {HTMLTableCellElement | undefined} cell
 */
function warnIfRowCellMissing(table, cell) {
  if (!cell) {
    console.warn(
      '[filtersort] A row is missing a cell for the sorted column. Use the same number of columns on every row in the CMS table (watch colspan/rowspan).',
      table
    );
  }
}

/**
 * Text List.js uses for sort, search, and filter options (link text when present).
 *
 * @param {HTMLTableCellElement | undefined} cell
 * @returns {string}
 */
function getCellText(cell) {
  if (!cell) {
    return '';
  }
  const link = cell.querySelector('a');
  const text = link ? link.textContent : cell.textContent;
  return (text ?? '').trim();
}

/**
 * @param {HTMLTableCellElement} th
 * @param {'ascending' | 'descending' | 'none'} ariaSort
 */
function setHeaderSortState(th, ariaSort) {
  th.setAttribute('aria-sort', ariaSort);
  const button = th.querySelector('button');
  if (!button) {
    return;
  }
  const label = th.dataset.sortLabel ?? '';
  button.setAttribute(
    'aria-label',
    ariaSort === 'none' ? label : `${label}, sorted ${ariaSort}`
  );
}

/**
 * @typedef {{ th: HTMLTableCellElement, button: HTMLButtonElement, key: string, columnIndex: number }} SortableColumn
 */

/**
 * List.js instance after sortable prep (subset used for client-side filter)
 * @typedef {object} SortableTableList
 * @property {(query?: string) => void} search
 * @property {object[]} matchingItems
 * @property {(event: string, callback: () => void) => void} on
 */

/**
 * @param {SortableColumn[]} columns
 */
function syncAriaFromListButtons(columns) {
  for (const { th, button } of columns) {
    let ariaSort = 'none';
    if (button.classList.contains('asc')) {
      ariaSort = 'ascending';
    } else if (button.classList.contains('desc')) {
      ariaSort = 'descending';
    }
    setHeaderSortState(th, ariaSort);
  }
}

/**
 * @param {string} tableId
 * @param {ParentNode} scopeElement
 * @returns {ParentNode | null}
 */
function findFilterGroupRoot(tableId, scopeElement) {
  const filters = findFilterControls(tableId, scopeElement);
  if (!filters.length) {
    return null;
  }
  return filters[0].closest('.' + FILTER_LIST_CLASS) ?? scopeElement;
}

/**
 * @param {string} tableId
 * @param {ParentNode} scopeElement
 * @returns {HTMLOutputElement[]}
 */
function findFilterCountElements(tableId, scopeElement) {
  const root = findFilterGroupRoot(tableId, scopeElement);
  if (!root) {
    return [];
  }
  return [ ...root.querySelectorAll('output.' + OUTPUT_CLASS) ].filter(
    (el) => el instanceof HTMLOutputElement
  );
}

/**
 * @param {number} count
 * @returns {string}
 */
function formatCount(count) {
  return (count === 1) ? '1 result' : `${count} results`;
}

/**
 * @param {string} tableId
 * @param {SortableTableList} list
 * @param {ParentNode} scopeElement
 */
function wireFilterCount(tableId, list, scopeElement) {
  const countElements = findFilterCountElements(tableId, scopeElement);
  if (!countElements.length) {
    return;
  }

  const sync = () => {
    const text = formatCount(list.matchingItems.length);
    for (const el of countElements) {
      el.value = text;
    }
  };

  list.on('searchComplete', sync);
  sync();
}

/**
 * @param {HTMLTableElement} table
 * @param {SortableTableList} list
 * @param {ParentNode} scopeElement
 */
function wireFilters(table, list, scopeElement) {
  const tableId = table.id;
  if (!tableId) {
    return;
  }

  const filterControls = findFilterControls(tableId, scopeElement);
  if (!filterControls.length) {
    return;
  }

  const applyFilters = () => {
    const terms = [ ...filterControls ].map(el =>
        (el instanceof HTMLInputElement || el instanceof HTMLSelectElement
          ? el.value
          : ''
      ).trim())
      .filter(Boolean);
    if (terms.length) {
      list.search(terms.join(' '));
    } else {
      list.search();
    }
  };

  for (const el of filterControls) {
    let eventName = 'change';
    if (el instanceof HTMLInputElement) {
      eventName =
        (el.type === 'search' || el.type === 'text' || el.type === '')
          ? 'input'
          : 'change';
    }
    el.addEventListener(eventName, applyFilters);
  }
}

/**
 * @param {HTMLTableElement} table
 * @param {ParentNode} scopeElement
 * @param {string} notSortableSelector
 * @param {string} buttonClass
 * @param {string} searchIconClass
 * @param {string} countClass
 */
function prepSortableTable(table, scopeElement, notSortableSelector, buttonClass, searchIconClass, countClass) {
  buildFilters(table, searchIconClass, countClass);

  const headerRow = table.tHead?.rows[0];
  if (!headerRow) {
    console.warn(
      '[filtersort] Table has no thead; skipping sortable enhancement.',
      table
    );
    return;
  }

  const tbody = table.tBodies[0];
  if (!tbody) {
    console.warn('[filtersort] Table has no tbody; skipping.', table);
    return;
  }

  tbody.classList.add(DEPEND_LIST_CLASS);

  /** @type {SortableColumn[]} */
  const columns = [];
  /** @type {Array<{ data: string[] }>} */
  const valueNames = [];
  [ ...headerRow.cells ].forEach((cell, columnIndex) => {
    if (!(cell instanceof HTMLTableCellElement)) {
      return;
    }
    if (cell.matches(notSortableSelector)) {
      return;
    }

    const label = (cell.textContent ?? '').trim();
    if (!label) {
      return;
    }

    const key = `col-${columnIndex}`;
    cell.dataset.sortLabel = label;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = [ buttonClass, DEPEND_BUTTON_CLASS ].filter(Boolean).join(' ');
    button.setAttribute('data-sort', key);
    while (cell.firstChild) {
      button.append(cell.firstChild);
    }
    cell.append(button);

    valueNames.push({ data: [ key ] });
    columns.push({ th: cell, button, key, columnIndex });

    for (const row of tbody.rows) {
      const rowCell = row.cells[columnIndex];
      warnIfRowCellMissing(table, rowCell);
      row.setAttribute(`data-${key}`, getCellText(rowCell));
    }
  });

  if (!columns.length) {
    console.warn(
      '[filtersort] No sortable columns after prep; skipping.',
      table
    );
    return;
  }

  const list = new window.List(table, {
    valueNames,
    listClass: DEPEND_LIST_CLASS,
    sortClass: DEPEND_BUTTON_CLASS,
  });

  list.on('sortComplete', () => syncAriaFromListButtons(columns));
  syncAriaFromListButtons(columns);
  if (table.id) {
    wireFilters(table, list, scopeElement);
    wireFilterCount(table.id, list, scopeElement);
  }
}

/**
 * Inject the filter `<template>` into the DOM if not already present.
 */
function ensureFilterTemplate() {
  if (document.getElementById(FILTER_TEMPLATE_ID)) {
    return;
  }
  const tpl = document.createElement('template');
  tpl.id = FILTER_TEMPLATE_ID;
  tpl.innerHTML = FILTER_TEMPLATE_HTML;
  document.body.appendChild(tpl);
}

/**
 * @param {object} [options]
 * @param {ParentNode} [options.scopeElement=document]
 * @param {string} [options.tableSelector=table.js-filtersort]
 * @param {string} [options.notSortableSelector=th.not-filtersort]
 * @param {string} [options.buttonClass=''] // e.g. 'c-button c-button--as-link'
 * @param {string} [options.searchIconClass=''] // e.g. 'icon icon-search icon-md'
 * @param {string} [options.countClass=''] // e.g. 'text-truncate'
 */
export default function filtersort({
  scopeElement = document,
  tableSelector = DEFAULT_TABLE_SELECTOR,
  notSortableSelector = NOT_SORTABLE_SELECTOR,
  buttonClass = '',
  searchIconClass = '',
  countClass = '',
} = {}) {
  if (typeof window.List !== 'function') {
    if (!listJsMissingLogged) {
      listJsMissingLogged = true;
      console.error(
        '[filtersort] List.js is not loaded; sortable tables will not be enhanced.'
      );
    }
    return;
  }

  ensureFilterTemplate();

  scopeElement.querySelectorAll(tableSelector).forEach((table) => {
    if (table instanceof HTMLTableElement) {
      prepSortableTable(table, scopeElement, notSortableSelector, buttonClass, searchIconClass, countClass);
    }
  });
}
