<script>
  import { untrack } from 'svelte';
  import GameCard from './lib/GameCard.svelte';
  import { platformConfig, allGames } from './lib/data.js';
  import './app.css';

  // Get unique genres (flattened from arrays)
  const allGenres = [...new Set(allGames.flatMap(g => g.genres))].sort();

  // State using $state rune
  let selectedPlatform = $state('All');
  let selectedGenre = $state('All');
  let showGemsOnly = $state(false);
  let showFavoritesOnly = $state(false);
  let searchQuery = $state('');
  let sortBy = $state('name-asc');
  let favoritesFirst = $state(true);
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
    if (favorites.includes(gameId)) {
      favorites = favorites.filter(id => id !== gameId);
    } else {
      favorites = [...favorites, gameId];
    }
  }

  const platforms = ['All', ...Object.keys(platformConfig)];
  const genres = ['All', ...allGenres];

  // Filtered and sorted games using $derived
  let filteredAndSortedGames = $derived.by(() => {
    let games = allGames.filter(game => {
      const matchesPlatform = selectedPlatform === 'All' || game.platform === selectedPlatform;
      const matchesGenre = selectedGenre === 'All' || game.genres.includes(selectedGenre);
      const matchesGems = !showGemsOnly || game.gem;
      const matchesFavorites = !showFavoritesOnly || favorites.includes(game.id);
      const matchesSearch = searchQuery === '' ||
        game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.notes.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesGenre && matchesGems && matchesFavorites && matchesSearch;
    });

    // Sort
    switch (sortBy) {
      case 'name-asc':
        games.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        games.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'platform':
        games.sort((a, b) => a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name));
        break;
      case 'genre':
        games.sort((a, b) => a.genres[0].localeCompare(b.genres[0]) || a.name.localeCompare(b.name));
        break;
      default:
        // Keep original order
        break;
    }

    // Always put favorites first if enabled
    if (favoritesFirst) {
      games.sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
      });
    }
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

  function clearAllFavorites() {
    if (confirm('Clear all favorites?')) {
      favorites = [];
    }
  }

  function resetFilters() {
    selectedPlatform = 'All';
    selectedGenre = 'All';
    showGemsOnly = false;
    showFavoritesOnly = false;
    searchQuery = '';
  }
</script>

<div class="min-h-screen">
  <!-- Header -->
  <header class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="text-center mb-3">
        <h1 class="retro-font text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 crt-flicker">
          RETRO GAMING LIBRARY
        </h1>
        <p class="text-gray-400 mt-1 text-sm">
          200 Essential Games • {favorites.length} Favorited
        </p>
      </div>

      <!-- Search & Sort Row -->
      <div class="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto mb-3">
        <input
          type="text"
          placeholder="🔍 Search games..."
          bind:value={searchQuery}
          class="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
        />
        <select
          bind:value={sortBy}
          class="px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="name-asc">Sort: A-Z</option>
          <option value="name-desc">Sort: Z-A</option>
          <option value="platform">Sort: Platform</option>
          <option value="genre">Sort: Genre</option>
        </select>
      </div>

      <!-- Platform Filters -->
      <div class="flex flex-wrap justify-center gap-1.5 mb-2">
        {#each platforms as platform}
          <button
            onclick={() => selectedPlatform = platform}
            class={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedPlatform === platform
                ? 'text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            style={selectedPlatform === platform ? `background-color: ${platformConfig[platform]?.color || '#6366F1'}` : ''}
          >
            {platformConfig[platform]?.icon || '🎮'} {platform}
            {#if platform !== 'All'}
              <span class="ml-1 opacity-70">({stats[platform]})</span>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Genre & Toggles -->
      <div class="flex flex-wrap justify-center items-center gap-2">
        <select
          bind:value={selectedGenre}
          class="px-2 py-1 rounded-lg bg-gray-700 border border-gray-600 text-white text-xs focus:outline-none focus:border-purple-500"
        >
          {#each genres as genre}
            <option value={genre}>{genre}</option>
          {/each}
        </select>

        <button
          onclick={() => showGemsOnly = !showGemsOnly}
          class={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            showGemsOnly
              ? 'bg-amber-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          💎 Hidden Gems
        </button>

        <button
          onclick={() => showFavoritesOnly = !showFavoritesOnly}
          class={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            showFavoritesOnly
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ❤️ Favorites ({favorites.length})
        </button>

        <button
          onclick={() => favoritesFirst = !favoritesFirst}
          class={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            favoritesFirst
              ? 'bg-pink-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          ⬆️ Favs First
        </button>

        {#if favorites.length > 0}
          <button
            onclick={clearAllFavorites}
            class="px-2 py-1 rounded-lg text-xs font-medium bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
          >
            Clear All
          </button>
        {/if}
      </div>

      <!-- Results count -->
      <div class="text-center text-gray-400 text-xs mt-2">
        Showing <span class="text-white font-semibold">{filteredAndSortedGames.length}</span> games
      </div>
    </div>
  </header>

  <!-- Game Grid -->
  <main class="max-w-7xl mx-auto px-4 py-6">
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {#each filteredAndSortedGames as game (game.id)}
        <GameCard
          {game}
          isFavorite={favorites.includes(game.id)}
          onToggleFavorite={toggleFavorite}
          onGenreClick={(genre) => { selectedGenre = genre; showGemsOnly = false; }}
          onGemClick={() => { showGemsOnly = true; selectedGenre = 'All'; }}
        />
      {/each}
    </div>

    {#if filteredAndSortedGames.length === 0}
      <div class="text-center py-16">
        <div class="text-6xl mb-4">🎮</div>
        <p class="text-gray-400 text-lg">No games found matching your filters</p>
        <button
          onclick={resetFilters}
          class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Reset Filters
        </button>
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="bg-gray-800 border-t border-gray-700 py-6">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {#each Object.entries(platformConfig) as [platform, config]}
          <div
            class="text-center p-2 rounded-lg cursor-pointer hover:opacity-80 transition"
            style="background-color: {config.color}20"
            onclick={() => selectedPlatform = platform}
            onkeydown={(e) => e.key === 'Enter' && (selectedPlatform = platform)}
            role="button"
            tabindex="0"
          >
            <div class="text-xl mb-1">{config.icon}</div>
            <div class="text-white font-medium text-xs">{platform}</div>
            <div class="text-lg font-bold" style="color: {config.color}">
              {stats[platform]}
            </div>
          </div>
        {/each}
      </div>
      <p class="text-gray-500 text-center mt-4 text-xs">
        Box art from LibRetro Thumbnails • Curated with ❤️ for retro gaming
      </p>
    </div>
  </footer>
</div>
