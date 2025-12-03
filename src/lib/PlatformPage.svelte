<script>
  import { untrack, tick } from 'svelte';
  import GameCard from './GameCard.svelte';
  import { platformConfig, allGames } from './data.js';
  import { navigate } from './router.svelte.js';
  import { search } from './searchStore.svelte.js';

  let { platform = 'All', initialGenre = null, initialGems = false, initialFavourites = false, initialHighlight = null } = $props();

  // Defer game list rendering until after view transition
  let ready = $state(false);
  $effect(() => {
    requestAnimationFrame(() => {
      ready = true;
    });
  });

  // Search input ref - focus if navigated with existing search query
  let searchInput = $state(null);
  $effect(() => {
    if (searchInput && untrack(() => search.query)) {
      searchInput.focus();
    }
  });

  // Get unique genres (flattened from arrays)
  const allGenres = [...new Set(allGames.flatMap(g => g.genres))].sort();
  let favorites = $state([]);

  // Load favorites from localStorage on init
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('retroLibraryFavorites');
      if (saved) {
        favorites = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load favorites');
    }
  }

  // Save favorites to localStorage using $effect
  $effect(() => {
    const currentFavorites = favorites;
    untrack(() => {
      try {
        localStorage.setItem('retroLibraryFavorites', JSON.stringify(currentFavorites));
      } catch (e) {
        console.warn('Could not save favorites');
      }
    });
  });

  function toggleFavorite(gameId) {
    const update = () => {
      if (favorites.includes(gameId)) {
        favorites = favorites.filter(id => id !== gameId);
      } else {
        favorites = [...favorites, gameId];
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(update);
    } else {
      update();
    }
  }

  // Filtered and sorted games using $derived (sorted once, not re-sorted on fav change)
  let filteredAndSortedGames = $derived.by(() => {
    let games = allGames.filter(game => {
      const matchesPlatform = platform === 'All' || game.platform === platform;
      const matchesGenre = !initialGenre || game.genres.includes(initialGenre);
      const matchesGems = !initialGems || game.gem;
      const matchesFavorites = !initialFavourites || favorites.includes(game.id);
      const matchesSearch = search.query === '' ||
        game.name.toLowerCase().includes(search.query.toLowerCase()) ||
        game.notes.toLowerCase().includes(search.query.toLowerCase());
      return matchesPlatform && matchesGenre && matchesGems && matchesFavorites && matchesSearch;
    });

    // Sort alphabetically only (favorites use CSS order)
    games.sort((a, b) => a.name.localeCompare(b.name));
    return games;
  });

  // Stats using $derived
  let stats = $derived.by(() => {
    const platformCounts = {};
    allGames.forEach(g => {
      platformCounts[g.platform] = (platformCounts[g.platform] || 0) + 1;
    });
    return platformCounts;
  });

  // Get platform info
  let platformInfo = $derived(platformConfig[platform] || null);
  let platformColor = $derived(platformInfo?.color || '#6366F1');
  let platformIcon = $derived(platformInfo?.icon || '🎮');

  // Page title logic
  let pageTitle = $derived.by(() => {
    if (initialFavourites) return 'Favourites';
    if (initialGems) return 'Hidden Gems';
    if (initialGenre) return initialGenre;
    if (platform === 'All') return 'All Games';
    return platform;
  });

  let pageSubtitle = $derived.by(() => {
    if (initialFavourites) return 'Your saved games';
    if (initialGems) return 'Overlooked classics worth discovering';
    if (initialGenre) return 'Games across all platforms';
    return null;
  });

  let gameCount = $derived(filteredAndSortedGames.length);

  // Count favorites that match current filters including search
  let matchingFavorites = $derived.by(() => {
    return allGames.filter(game => {
      const matchesPlatform = platform === 'All' || game.platform === platform;
      const matchesGenre = !initialGenre || game.genres.includes(initialGenre);
      const matchesGems = !initialGems || game.gem;
      const matchesSearch = search.query === '' ||
        game.name.toLowerCase().includes(search.query.toLowerCase()) ||
        game.notes.toLowerCase().includes(search.query.toLowerCase());
      return matchesPlatform && matchesGenre && matchesGems && matchesSearch && favorites.includes(game.id);
    }).length;
  });

  // Random game selection
  let highlightedGameId = $state(null);
  let isAnimating = $state(false);
  let highlightTimeout = null;

  function pickRandomGame() {
    if (filteredAndSortedGames.length === 0) return;

    // Clear any pending timeout
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }

    // Reset animations by clearing highlight first
    highlightedGameId = null;
    isAnimating = false;

    // Wait for DOM to clear animations, then start new one
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const randomIndex = Math.floor(Math.random() * filteredAndSortedGames.length);
        const randomGame = filteredAndSortedGames[randomIndex];
        highlightedGameId = randomGame.id;
        isAnimating = true;

        // Update URL with highlight param
        const basePath = window.location.hash.split('?')[0];
        window.history.replaceState(null, '', `${basePath}?highlight=${randomGame.id}`);

        // Scroll to the game card
        tick().then(() => {
          const element = document.querySelector(`[data-game-id="${randomGame.id}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });

        // Clear animation flag after animation (but keep highlight)
        highlightTimeout = setTimeout(() => {
          isAnimating = false;
          highlightTimeout = null;
        }, 6000);
      });
    });
  }

  // Reset highlight when route changes without a highlight param
  $effect(() => {
    // Track route-related props to detect navigation
    platform; initialGenre; initialGems; initialFavourites;

    if (!initialHighlight) {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        highlightTimeout = null;
      }
      highlightedGameId = null;
      isAnimating = false;
    }
  });

  // Handle initial highlight from navigation
  $effect(() => {
    if (initialHighlight && ready) {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      // Small delay to ensure DOM is fully rendered with filtered games
      setTimeout(() => {
        // Check if highlighted game is in the current filtered list
        const gameInList = filteredAndSortedGames.some(g => g.id === initialHighlight);
        if (!gameInList) {
          // Redirect to All with highlight
          navigate(`/platform/All?highlight=${initialHighlight}`);
          return;
        }

        highlightedGameId = initialHighlight;
        isAnimating = true;

        // Spin the random button
        const randomBtnSvg = document.querySelector('[style*="view-transition-name: random-btn"] svg');
        if (randomBtnSvg) {
          randomBtnSvg.classList.add('spin-once');
        }

        tick().then(() => {
          const element = document.querySelector(`[data-game-id="${initialHighlight}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        highlightTimeout = setTimeout(() => {
          isAnimating = false;
          highlightTimeout = null;
        }, 6000);
      }, 100);
    }
  });
</script>

<div class="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
  <!-- Header -->
  <header class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <!-- Header row -->
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <!-- Back button and title -->
        <div class="flex items-center gap-4">
          <button
            onclick={() => { search.query = ''; navigate('/'); }}
            class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition"
            title="Home"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </button>
          <div class="flex items-center gap-3 lg:gap-5">
            {#if initialFavourites}
              <span class="text-3xl" style="view-transition-name: platform-Favourites">❤️</span>
            {:else if initialGems}
              <span class="text-3xl" style="view-transition-name: platform-Gems">💎</span>
            {:else if initialGenre}
              <span class="text-3xl">🎯</span>
            {:else if platform === 'All'}
              <img src="/logo.png" alt="All Games" style="view-transition-name: platform-All" class="h-8 w-8 object-contain" />
            {:else}
              <img src={platformInfo?.logo} alt={platform} style="view-transition-name: platform-{platform}" class="h-8 object-contain" onerror={(e) => { e.target.style.display = 'none'; }} />
            {/if}
            <div>
              <h1 class="retro-font text-lg md:text-xl text-white">
                <span style={!initialGenre && !initialGems && !initialFavourites ? `view-transition-name: platform-${platform}-name` : ''}>{pageTitle}</span> <span class="text-gray-400 font-normal" style={!initialGenre && !initialGems && !initialFavourites ? `view-transition-name: platform-${platform}-count` : ''}>({gameCount})</span>
              </h1>
              <p class="text-gray-400 text-xs">
                {#if pageSubtitle}{pageSubtitle}{/if}
                {#if matchingFavorites > 0}{#if pageSubtitle} • {/if}{matchingFavorites} favourited{/if}
              </p>
            </div>
          </div>
        </div>

        <!-- Random + Search -->
        <div class="flex items-center gap-2 max-w-md mx-auto md:ml-auto md:mr-0">
          {#if filteredAndSortedGames.length > 1}
            <button
              onclick={(e) => { e.currentTarget.querySelector('svg').classList.add('spin-once'); pickRandomGame(); }}
              style="view-transition-name: random-btn"
              class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition shrink-0"
              title="Random game"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" onanimationend={(e) => e.target.classList.remove('spin-once')}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          {/if}
          <div class="md:w-48 lg:w-64 xl:w-80">
            <input
            bind:this={searchInput}
            bind:value={search.query}
            type="search"
            placeholder="Search games..."
            style="view-transition-name: search-box"
            class="w-full px-4 py-2 rounded-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Game Grid -->
  <main class="max-w-7xl mx-auto px-4 py-6 flex-grow">
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {#if ready}
        {#each filteredAndSortedGames as game (game.id)}
          <div
            data-game-id={game.id}
            style="order: {favorites.includes(game.id) ? 0 : 1}{filteredAndSortedGames.length < 30 ? `; view-transition-name: game-${game.id}` : ''}{highlightedGameId ? `; animation: ${highlightedGameId === game.id ? 'randomPick 4s' : 'fadeOut 6s'} ease-out` : ''}; max-width: 250px"
            class={highlightedGameId === game.id ? 'random-highlight-base' : ''}
          >
            <GameCard
              {game}
              isFavorite={favorites.includes(game.id)}
              onToggleFavorite={toggleFavorite}
              isHighlighted={highlightedGameId === game.id}
              highlightAnimation={highlightedGameId === game.id && isAnimating}
            />
          </div>
        {/each}
      {/if}
    </div>

    {#if filteredAndSortedGames.length === 0}
      <div class="text-center py-16">
        <img src="/logo.png" alt="" class="w-24 h-24 mx-auto mb-4 opacity-50" style="filter: grayscale(1);" />
        <p class="text-gray-400 text-lg">No games found</p>
        {#if search.query}
          <button
            onclick={() => search.query = ''}
            class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Clear Search
          </button>
        {/if}
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="py-6">
    <div class="max-w-7xl mx-auto px-4">
      {#if initialGenre}
        <!-- Show genres when viewing a genre page -->
        <div class="flex flex-wrap justify-center gap-2">
          {#each allGenres as genre}
            {@const genreCount = allGames.filter(g => g.genres.includes(genre)).length}
            <button
              class="px-3 py-2 rounded-lg hover:opacity-80 transition {genre === initialGenre ? 'bg-purple-600' : 'bg-gray-700'}"
              onclick={() => navigate(`/genre/${encodeURIComponent(genre)}`)}
            >
              <span class="text-white font-medium text-xs">{genre}</span>
              <span class="text-gray-400 text-xs ml-1">({genreCount})</span>
            </button>
          {/each}
        </div>
      {:else}
        <!-- Show platforms -->
        <div class="flex flex-wrap justify-center gap-4">
          {#each Object.entries(platformConfig) as [plat, config]}
            <button
              class="p-2 rounded-lg hover:opacity-80 transition hover:scale-105"
              onclick={() => navigate(`/platform/${encodeURIComponent(plat)}`)}
              title={plat}
            >
              <img
                src={config.logo}
                alt={plat}
                class="h-7 object-contain"
                onerror={(e) => { e.target.style.display = 'none'; }}
              />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </footer>
</div>
