<script>
  import { tick } from "svelte";
  import BoxArt from "./BoxArt.svelte";
  import { platformConfig } from "./data.js";
  import { navigate, transitioningGame } from "./router.svelte.js";
  import { getGenreColor } from "./utils.js";

  let {
    game,
    isFavorite,
    onToggleFavorite,
    isHighlighted = false,
    highlightAnimation = false,
    lazyImage = true,
    searchQuery = "",
    isSparkling = false,
  } = $props();

  let config = $derived(platformConfig[game.platform]);

  // Split text into parts for highlighting
  function highlightParts(text, query) {
    if (!query) return [{ text, highlight: false }];
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts = [];
    let lastIndex = 0;
    let index = lowerText.indexOf(lowerQuery);
    while (index !== -1) {
      if (index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, index), highlight: false });
      }
      parts.push({
        text: text.slice(index, index + query.length),
        highlight: true,
      });
      lastIndex = index + query.length;
      index = lowerText.indexOf(lowerQuery, lastIndex);
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }
    return parts;
  }

  let nameParts = $derived(highlightParts(game.name, searchQuery));
  let notesParts = $derived(highlightParts(game.notes, searchQuery));

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
    navigate("/gems");
  }

  async function handleCardClick() {
    // Set transitioning game - this triggers reactive class/style bindings
    transitioningGame.id = game.id;
    await tick();
    navigate(`/game/${encodeURIComponent(game.id)}`);
  }
</script>

<div
  class="game-card bg-gray-900 rounded-xl overflow-hidden shadow-xl border border-gray-700 hover:border-gray-500 relative cursor-pointer {isSparkling
    ? 'sparkle-effect'
    : ''}"
  style={highlightAnimation
    ? "animation: randomPickGlow 4s ease-out forwards"
    : isHighlighted
      ? "box-shadow: 0 0 15px 3px rgba(168, 85, 247, 0.5)"
      : ""}
  onclick={handleCardClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && handleCardClick()}
>
  <button
    onclick={toggleFavorite}
    class={`fav-btn absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full transition ${isFavorite ? "bg-black/50 backdrop-blur-sm hover:opacity-75" : "opacity-50 hover:opacity-100 bg-black/50 backdrop-blur-sm"}`}
  >
    <span class="text-lg">{isFavorite ? "❤️" : "🤍"}</span>
  </button>
  <BoxArt {game} {isTransitioning} lazy={lazyImage} />
  <div class="p-3">
    <h3
      class={`text-white font-semibold text-sm mb-1 line-clamp-2 leading-tight pr-6 ${isTransitioning ? "vt-game-title" : ""}`}
      style={isTransitioning ? `--vt-title-name: game-${game.id}-title` : ""}
    >
      {#each nameParts as part}{#if part.highlight}<mark class="search-match"
            >{part.text}</mark
          >{:else}{part.text}{/if}{/each}
    </h3>
    <div class="flex flex-wrap gap-1 mb-2">
      {#each game.genres as genre}
        <button
          onclick={(e) => handleGenreClick(e, genre)}
          class="dynamic-hover text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 transition-colors cursor-pointer"
          style="--hover-color: {getGenreColor(genre)}"
        >
          {genre}
        </button>
      {/each}
      {#if game.gem}
        <button
          onclick={handleGemClick}
          class="dynamic-hover text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 transition-colors cursor-pointer"
          style="--hover-color: {getGenreColor('Hidden Gems')}"
        >
          💎 Gem
        </button>
      {/if}
    </div>
    <p class="text-gray-400 text-xs line-clamp-2">
      {#each notesParts as part}{#if part.highlight}<mark class="search-match"
            >{part.text}</mark
          >{:else}{part.text}{/if}{/each}
    </p>
  </div>
</div>

<style>
  /* Sparkle/Shine Effect */
  .sparkle-effect {
    position: relative;
    overflow: hidden;
  }

  .sparkle-effect::after {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: skewX(-25deg);
    animation: shimmer 2s infinite;
    pointer-events: none; /* Ensure clicks pass through */
    z-index: 20; /* Above content but below favorite button if z-index is managed right, or adjust as needed */
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 200%;
    }
  }

  .dynamic-hover {
    position: relative;
    overflow: hidden;
    z-index: 1;
    transition: color 0.7s ease;
  }

  .dynamic-hover::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(to bottom, #374151, var(--hover-color));
    opacity: 0;
    transition: opacity 0.7s ease;
    z-index: -1;
  }

  .dynamic-hover:hover {
    color: white !important;
  }

  .dynamic-hover:hover::before {
    opacity: 1;
  }
</style>
