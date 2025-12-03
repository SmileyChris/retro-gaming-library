// Simple hash-based router using Svelte 5 runes
import { tick } from 'svelte';

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

  // Game detail page: /game/:id
  const gameMatch = path.match(/^\/game\/(.+)$/);
  if (gameMatch) {
    return {
      page: 'game',
      gameId: decodeURIComponent(gameMatch[1])
    };
  }

  return { page: 'home', platform: null, genre: null, gems: false, favourites: false, search: '' };
}

let currentRoute = $state(parseHash());
let isNavigating = false;

// Track which game is transitioning (for back navigation)
export const transitioningGame = $state({ id: null });

// Listen for hash changes (browser back/forward)
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    // Skip if this was triggered by navigate()
    if (isNavigating) return;

    // If leaving a game detail page, set the transitioning game ID
    if (currentRoute.page === 'game' && currentRoute.gameId) {
      transitioningGame.id = currentRoute.gameId;
    }

    // Browser back/forward - use view transition
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        currentRoute = parseHash();
      });
    } else {
      currentRoute = parseHash();
    }
  });
}

export function navigate(path) {
  isNavigating = true;
  if (document.startViewTransition) {
    const transition = document.startViewTransition(async () => {
      window.location.hash = path;
      currentRoute = parseHash();
      // Wait for Svelte to render new page before capturing new state
      await tick();
    });
    transition.finished.then(() => {
      isNavigating = false;
      transitioningGame.id = null;
    });
  } else {
    window.location.hash = path;
    currentRoute = parseHash();
    isNavigating = false;
  }
}

export function getRoute() {
  return currentRoute;
}
