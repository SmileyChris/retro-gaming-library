<script>
  import { platformConfig } from "./data.js";
  import { navigate } from "./router.svelte.js";
  import { gameFilename } from "./utils.js";

  let {
    game,
    element = $bindable(null),
    isTransitioning = false,
    lazy = true,
  } = $props();

  const config = platformConfig[game.platform];
  const localUrl = `/boxart/${game.platform}/${gameFilename(game.name)}`;

  function handlePlatformClick(event) {
    event.stopPropagation();
    navigate(`/platform/${encodeURIComponent(game.platform)}`);
  }
</script>

<div
  bind:this={element}
  class={`box-art relative bg-linear-to-br ${config.gradient} rounded-lg overflow-hidden shadow-lg ${isTransitioning ? "vt-game-image" : ""}`}
  style={isTransitioning ? `--vt-image-name: game-${game.id}-image` : ""}
>
  <img
    src={localUrl}
    alt={game.name}
    class="absolute inset-0 w-full h-full object-cover"
    loading={lazy ? "lazy" : "eager"}
  />

  <button
    onclick={handlePlatformClick}
    class="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2 hover:bg-black/80 transition-colors cursor-pointer"
  >
    <div class="text-white/90 text-xs font-medium flex items-center gap-1">
      <span>{config.icon}</span>
      <span>{game.platform}</span>
    </div>
  </button>
</div>
