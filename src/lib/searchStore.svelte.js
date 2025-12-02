// Shared search state using Svelte 5 runes
let searchQuery = $state('');

export function getSearchQuery() {
  return searchQuery;
}

export function setSearchQuery(value) {
  searchQuery = value;
}
