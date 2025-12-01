<script>
  import BoxArt from './BoxArt.svelte';
  import { platformConfig } from './data.js';

  let { game, isFavorite, onToggleFavorite } = $props();

  let config = $derived(platformConfig[game.platform]);

  function toggleFavorite(event) {
    event.stopPropagation();
    onToggleFavorite?.(game.id);
  }
</script>

<div class="game-card bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700 hover:border-gray-500 relative">
  <button
    onclick={toggleFavorite}
    class={`fav-btn absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition ${isFavorite ? 'active' : ''}`}
  >
    <span class="text-lg">{isFavorite ? '❤️' : '🤍'}</span>
  </button>
  <BoxArt {game} />
  <div class="p-3">
    <h3 class="text-white font-semibold text-sm mb-1 line-clamp-2 leading-tight pr-6">
      {game.name}
    </h3>
    <div class="flex flex-wrap gap-1 mb-2">
      {#each game.genres as genre}
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
          {genre}
        </span>
      {/each}
      {#if game.hidden}
        <span class="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300">
          💎 Gem
        </span>
      {/if}
    </div>
    <p class="text-gray-400 text-xs line-clamp-2">{game.notes}</p>
  </div>
</div>
