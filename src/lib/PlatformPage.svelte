<script>
  import { untrack } from 'svelte';
  import GameCard from './GameCard.svelte';
  import { platformConfig, allGames } from './data.js';
  import { navigate } from './router.svelte.js';
  import { getSearchQuery, setSearchQuery } from './searchStore.svelte.js';

  let { platform = 'All', initialGenre = null, initialGems = false, initialFavourites = false } = $props();

  // Get unique genres (flattened from arrays)
  const allGenres = [...new Set(allGames.flatMap(g => g.genres))].sort();

  // Use shared search state
  let searchQuery = $derived(getSearchQuery());
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
      const matchesSearch = searchQuery === '' ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.notes.toLowerCase().includes(searchQuery.toLowerCase());
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
      const matchesSearch = searchQuery === '' ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.notes.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesGenre && matchesGems && matchesSearch && favorites.includes(game.id);
    }).length;
  });
</script>

<div class="min-h-screen flex flex-col bg-[#1a1625]">
  <!-- Header -->
  <header class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <!-- Header row -->
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <!-- Back button and title -->
        <div class="flex items-center gap-4">
          <button
            onclick={() => navigate('/')}
            class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition"
            title="Home"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </button>
          <div class="flex items-center gap-3">
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

        <!-- Search -->
        <div class="max-w-md mx-auto md:ml-auto md:mr-0 md:w-48 lg:w-64 xl:w-80">
          <input
            type="search"
            placeholder="Search games..."
            value={searchQuery}
            oninput={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value === '' && platform === 'All' && !initialGenre && !initialGems && !initialFavourites) {
                navigate('/');
              }
            }}
            autofocus
            style="view-transition-name: search-box"
            class="w-full px-4 py-2 rounded-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </div>
  </header>

  <!-- Game Grid -->
  <main class="max-w-7xl mx-auto px-4 py-6 flex-grow">
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {#each filteredAndSortedGames as game (game.id)}
        <div style="order: {favorites.includes(game.id) ? 0 : 1}{filteredAndSortedGames.length < 30 ? `; view-transition-name: game-${game.id}` : ''}">
          <GameCard
            {game}
            isFavorite={favorites.includes(game.id)}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      {/each}
    </div>

    {#if filteredAndSortedGames.length === 0}
      <div class="text-center py-16">
        <div class="text-6xl mb-4">🎮</div>
        <p class="text-gray-400 text-lg">No games found</p>
        {#if searchQuery}
          <button
            onclick={() => searchQuery = ''}
            class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Clear Search
          </button>
        {/if}
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="bg-gray-800 border-t border-gray-700 py-6">
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
                style={plat !== platform ? `view-transition-name: platform-${plat}` : ''}
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
