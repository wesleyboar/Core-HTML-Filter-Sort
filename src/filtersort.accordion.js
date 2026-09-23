export const DEFAULT_ACCORDION_SELECTOR = '.js-filtersort-accordion';
const LIST_CLASS = 'js-list';
const SEARCH_ATTR = 'data-filtersort-search-text';
const FACET_SELECTOR = '[data-filtersort-facet][data-filtersort-value]';

function getFacets(details) {
  return [...details.querySelectorAll(FACET_SELECTOR)]
    .map((el) => ({
      group: el.getAttribute('data-filtersort-facet')?.trim(),
      value: el.getAttribute('data-filtersort-value')?.trim(),
    }))
    .filter(({ group, value }) => group && value);
}

function makeControls(container, detailsItems) {
  const groups = new Map();
  for (const details of detailsItems) {
    for (const { group, value } of getFacets(details)) {
      if (!groups.has(group)) groups.set(group, new Set());
      groups.get(group).add(value);
    }
  }

  if (!container.hasAttribute('data-filtersort-search') && !groups.size) return null;

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'js-filtersort-form filtersort-accordion-form';
  const legend = document.createElement('legend');
  legend.textContent = 'Filter accordions';
  fieldset.append(legend);

  let search;
  if (container.hasAttribute('data-filtersort-search')) {
    const label = document.createElement('label');
    label.textContent = 'Search ';
    search = document.createElement('input');
    search.type = 'search';
    search.className = 'js-filtersort-filter';
    search.setAttribute('aria-controls', container.id);
    label.append(search);
    fieldset.append(label);
  }

  const facetControls = new Map();
  for (const [group, values] of groups) {
    const groupFieldset = document.createElement('fieldset');
    const groupLegend = document.createElement('legend');
    groupLegend.textContent = group;
    groupFieldset.append(groupLegend);

    const controls = [];
    for (const value of [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = value;
      input.className = 'js-filtersort-filter';
      input.setAttribute('aria-controls', container.id);
      label.append(input, document.createTextNode(` ${value}`));
      groupFieldset.append(label);
      controls.push(input);
    }
    fieldset.append(groupFieldset);
    facetControls.set(group, controls);
  }

  const output = document.createElement('output');
  output.className = 'js-filtersort-total';
  output.setAttribute('aria-live', 'polite');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset filters';
  reset.disabled = true;
  fieldset.append(output, reset);
  container.prepend(fieldset);
  return { search, facetControls, output, reset };
}

function matchesFacets(details, selected) {
  const facets = getFacets(details);
  return [...selected].every(([group, values]) =>
    facets.some((facet) => facet.group === group && values.has(facet.value))
  );
}

export function prepAccordions(scopeElement, selector = DEFAULT_ACCORDION_SELECTOR) {
  scopeElement.querySelectorAll(selector).forEach((container) => {
    if (!(container instanceof HTMLElement) || container.dataset.filtersortReady === 'true') return;
    if (!container.id) {
      console.warn('[filtersort] Accordion filters require a container id; skipping.', container);
      return;
    }

    const listElement = [...container.children].find((el) => el.classList.contains(LIST_CLASS));
    if (!listElement) {
      console.warn('[filtersort] Accordion container needs a direct .js-list child; skipping.', container);
      return;
    }
    const detailsItems = [...listElement.children].filter((el) => el instanceof HTMLDetailsElement);
    if (!detailsItems.length || detailsItems.length !== listElement.children.length) {
      console.warn('[filtersort] Accordion list must contain only <details> items; skipping.', container);
      return;
    }

    for (const details of detailsItems) {
      details.setAttribute(SEARCH_ATTR, (details.textContent ?? '').trim());
    }

    const controls = makeControls(container, detailsItems);
    if (!controls) return;

    const list = new window.List(container, {
      listClass: LIST_CLASS,
      valueNames: [{ data: ['filtersort-search-text'] }],
    });
    const empty = document.createElement('p');
    empty.className = 'js-filtersort-empty';
    empty.textContent = container.getAttribute('data-filtersort-empty-text') || 'No results found';
    listElement.after(empty);

    const sync = () => {
      const count = list.matchingItems.length;
      controls.output.value = count === 1 ? '1 result' : `${count} results`;
      empty.hidden = count !== 0;
    };
    list.on('searchComplete', sync);

    const apply = () => {
      const selected = new Map();
      for (const [group, inputs] of controls.facetControls) {
        const values = new Set(inputs.filter((input) => input.checked).map((input) => input.value));
        if (values.size) selected.set(group, values);
      }
      controls.reset.disabled = !selected.size && !controls.search?.value.trim();
      list.filter(selected.size ? (item) => matchesFacets(item.elm, selected) : undefined);
      list.search(controls.search?.value.trim() ?? '');
    };
    controls.search?.addEventListener('input', apply);
    for (const inputs of controls.facetControls.values()) {
      for (const input of inputs) input.addEventListener('change', apply);
    }
    controls.reset.addEventListener('click', () => {
      if (controls.search) controls.search.value = '';
      for (const inputs of controls.facetControls.values()) {
        for (const input of inputs) input.checked = false;
      }
      apply();
    });
    container.dataset.filtersortReady = 'true';
    sync();
  });
}
