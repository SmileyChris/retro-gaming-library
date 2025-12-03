<script>
  import { tick } from 'svelte';
  import BoxArt from './BoxArt.svelte';
  import { platformConfig } from './data.js';
  import { navigate, transitioningGame } from './router.svelte.js';

  let { game, isFavorite, onToggleFavorite, isHighlighted = false, highlightAnimation = false, lazyImage = true } = $props();

  let config = $derived(platformConfig[game.platform]);
  let boxArtElement = null;
  let titleElement = null;

  // Check if this card should have transition names (for back navigation)
  let isTransitioning = $derived(transitioningGame.id === game.id);

  function toggleFavorite(event) {
    event.stopPropagation();
    onToggleFavorite?.(game.id);
  }

  function handleGenreClick(event, genre) {
    event.stopPropagation();
    navigate(`/genre/${encodeURIComponent(genre)}`);
  }

  function handleGemClick(event) {
    event.stopPropagation();
    navigate('/gems');
  }

  async function handleCardClick() {
    // Set transitioning game - this triggers reactive class/style bindings
    transitioningGame.id = game.id;
    await tick();
    navigate(`/game/${encodeURIComponent(game.id)}`);
  }
</script>

<div
  class="game-card bg-gray-900 rounded-xl overflow-hidden shadow-xl border border-gray-700 hover:border-gray-500 relative cursor-pointer"
  style={highlightAnimation ? 'animation: randomPickGlow 4s ease-out forwards' : (isHighlighted ? 'box-shadow: 0 0 15px 3px rgba(168, 85, 247, 0.5)' : '')}
  onclick={handleCardClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && handleCardClick()}
>
  <button
    onclick={toggleFavorite}
    class={`fav-btn absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full transition ${isFavorite ? 'bg-black/50 backdrop-blur-sm hover:opacity-75' : 'opacity-50 hover:opacity-100 bg-black/50 backdrop-blur-sm'}`}
  >
    <span class="text-lg">{isFavorite ? '❤️' : '🤍'}</span>
  </button>
  <BoxArt {game} bind:element={boxArtElement} {isTransitioning} lazy={lazyImage} />
  <div class="p-3">
    <h3
      bind:this={titleElement}
      class={`text-white font-semibold text-sm mb-1 line-clamp-2 leading-tight pr-6 ${isTransitioning ? 'vt-game-title' : ''}`}
      style={isTransitioning ? `--vt-title-name: game-${game.id}-title` : ''}
    >
      {game.name}
    </h3>
    <div class="flex flex-wrap gap-1 mb-2">
      {#each game.genres as genre}
        <button
          onclick={(e) => handleGenreClick(e, genre)}
          class="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
        >
          {genre}
        </button>
      {/each}
      {#if game.gem}
        <button
          onclick={handleGemClick}
          class="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
        >
          💎 Gem
        </button>
      {/if}
    </div>
    <p class="text-gray-400 text-xs line-clamp-2">{game.notes}</p>
  </div>
</div>
