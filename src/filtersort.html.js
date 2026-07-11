/**
 * Inner HTML for the `<template id="filtersort-form">` element.
 * Injected into the DOM by `filtersort.js` if not already present.
 */
export const FILTER_TEMPLATE_HTML = /* html */`
  <fieldset class="js-filtersort-form filtersort-form">
    <legend class="sr-only">Results in the table update as you type or select filters</legend>

    <label class="filtersort__filter mr-auto">
      <i
        class="filtersort__icon"
        aria-label="Search"
      >Search</i>
      <input
        type="search"
        class="filtersort__input"
        placeholder="Search…"
      />
      <output class="js-filtersort-total" aria-atomic="true"></output>
    </label>

    <label class="filtersort__filter">
      <span class="filtersort__label"></span>
      <select class="filtersort__input">
        <option value="">any</option>
      </select>
    </label>
  </fieldset>`;
