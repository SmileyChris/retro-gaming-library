<script>
  import { untrack, tick } from 'svelte';
  import { navigate, transitioningGame } from './router.svelte.js';
  import { platformConfig, allGames } from './data.js';
  import { gameDescriptions } from './descriptions.js';

  let { gameId } = $props();

  // Find the game
  let game = $derived(allGames.find(g => g.id === gameId));
  let config = $derived(game ? platformConfig[game.platform] : null);

  // Favorites management
  let favorites = $state([]);
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

  let isFavorite = $derived(game ? favorites.includes(game.id) : false);

  function toggleFavorite() {
    if (!game) return;
    if (favorites.includes(game.id)) {
      favorites = favorites.filter(id => id !== game.id);
    } else {
      favorites = [...favorites, game.id];
    }
  }

  // Box art path
  let boxArtUrl = $derived(game ? `/boxart/${game.platform}/${game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png` : '');

  // Screenshot path
  let screenshotUrl = $derived(game ? `/screenshots/${game.platform}/${game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png` : '');
  let hasScreenshot = $state(false);

  // Check if screenshot exists by actually loading the image
  $effect(() => {
    if (screenshotUrl) {
      hasScreenshot = false;
      const img = new Image();
      img.onload = () => { hasScreenshot = true; };
      img.onerror = () => { hasScreenshot = false; };
      img.src = screenshotUrl;
    }
  });

  // Description (from separate descriptions file)
  let description = $derived(game ? gameDescriptions[game.id] : null);

  async function navigateAway(path) {
    transitioningGame.id = game.id;
    await tick();
    navigate(path);
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateAway('/');
    }
  }
</script>

{#if game}
  <div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
    <!-- Header -->
    <header class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-50">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center gap-4">
          <button
            onclick={goBack}
            class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition"
            title="Back"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="flex items-center gap-8">
            <button
              onclick={() => navigateAway(`/platform/${encodeURIComponent(game.platform)}`)}
              class="hover:opacity-80 transition"
              title={game.platform}
            >
              <img
                src={config.logo}
                alt={game.platform}
                class="h-6 object-contain"
                onerror={(e) => { e.target.style.display = 'none'; }}
              />
            </button>
            <h1 class="retro-font text-lg text-white truncate">{game.name}</h1>
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row gap-8">
        <!-- Box Art -->
        <div class="md:w-1/3 shrink-0">
          <div
            class="relative rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br {config.gradient} vt-game-image"
            style="--vt-image-name: game-{game.id}-image"
          >
            <img
              src={boxArtUrl}
              alt={game.name}
              class="w-full h-auto"
            />
            <!-- Favorite button -->
            <button
              onclick={toggleFavorite}
              class="absolute top-3 right-3 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition"
            >
              <span class="text-2xl">{isFavorite ? '❤️' : '🤍'}</span>
            </button>
          </div>
        </div>

        <!-- Details -->
        <div class="flex-1 space-y-6">
          <!-- Title -->
          <div>
            <h2
              class="retro-font text-2xl md:text-3xl text-white mb-2 vt-game-title"
              style="--vt-title-name: game-{game.id}-title"
            >
              {game.name}
            </h2>
            <p class="text-purple-300 text-sm font-medium mb-4">{game.notes}</p>

            <!-- Genres -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm" style="view-transition-name: game-{game.id}-genres">
              {#each game.genres as genre}
                <button
                  onclick={() => navigateAway(`/genre/${encodeURIComponent(genre)}`)}
                  class="inline-flex items-center gap-1.5 text-gray-400 hover:text-purple-400 transition cursor-pointer"
                >
                  <span style="filter: grayscale(1);">🏷️</span>
                  {genre}
                </button>
              {/each}
              {#if game.gem}
                <button
                  onclick={() => navigateAway('/gems')}
                  class="inline-flex items-center gap-1.5 text-gray-400 hover:text-purple-400 transition cursor-pointer"
                >
                  <span style="filter: grayscale(1);">💎</span>
                  Hidden Gem
                </button>
              {/if}
            </div>

            {#if description}
              {#each description.split('\n\n') as paragraph}
                <p class="text-gray-300 leading-relaxed mb-4">{paragraph}</p>
              {/each}
            {/if}
          </div>

          <!-- Screenshot -->
          {#if hasScreenshot}
            <div class="rounded-lg overflow-hidden border border-gray-700">
              <img
                src={screenshotUrl}
                alt="{game.name} screenshot"
                class="w-full h-auto"
              />
            </div>
          {/if}

        </div>
      </div>
    </main>
  </div>
{:else}
  <div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
    <div class="text-center">
      <p class="text-gray-400 text-lg mb-4">Game not found</p>
      <button
        onclick={() => navigate('/')}
        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
      >
        Go Home
      </button>
    </div>
  </div>
{/if}
