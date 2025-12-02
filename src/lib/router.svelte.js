// Simple hash-based router using Svelte 5 runes

function parseHash() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');

  // Home page
  if (path === '/' || path === '/home' || path === '') {
    return { page: 'home', platform: null, genre: null, gems: false, favourites: false, search: '' };
  }

  // Platform page: /platform/:name
  const platformMatch = path.match(/^\/platform\/(.+)$/);
  if (platformMatch) {
    return {
      page: 'browse',
      platform: decodeURIComponent(platformMatch[1]),
      genre: null,
      gems: false,
      favourites: false,
      search: params.get('search') || '',
      highlight: params.get('highlight') || null
    };
  }

  // Genre page: /genre/:name
  const genreMatch = path.match(/^\/genre\/(.+)$/);
  if (genreMatch) {
    return {
      page: 'browse',
      platform: 'All',
      genre: decodeURIComponent(genreMatch[1]),
      gems: false,
      favourites: false,
      search: '',
      highlight: params.get('highlight') || null
    };
  }

  // Hidden gems page: /gems
  if (path === '/gems') {
    return {
      page: 'browse',
      platform: 'All',
      genre: null,
      gems: true,
      favourites: false,
      search: '',
      highlight: params.get('highlight') || null
    };
  }

  // Favourites page: /favourites
  if (path === '/favourites') {
    return {
      page: 'browse',
      platform: 'All',
      genre: null,
      gems: false,
      favourites: true,
      search: '',
      highlight: params.get('highlight') || null
    };
  }

  return { page: 'home', platform: null, genre: null, gems: false, favourites: false, search: '' };
}

let currentRoute = $state(parseHash());

// Listen for hash changes (browser back/forward)
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    currentRoute = parseHash();
  });
}

function updateRoute(path) {
  window.location.hash = path;
  currentRoute = parseHash();
}

export function navigate(path) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      updateRoute(path);
    });
  } else {
    updateRoute(path);
  }
}

export function getRoute() {
  return currentRoute;
}
