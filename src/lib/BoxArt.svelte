<script>
  import { platformConfig } from './data.js';
  import { navigate } from './router.svelte.js';

  let { game } = $props();

  const config = platformConfig[game.platform];
  const filename = game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
  const localUrl = `/boxart/${game.platform}/${filename}`;

  function handlePlatformClick(event) {
    event.stopPropagation();
    navigate(`/platform/${encodeURIComponent(game.platform)}`);
  }
</script>

<div class={`box-art relative bg-gradient-to-br ${config.gradient} rounded-lg overflow-hidden shadow-lg`}>
  <img
    src={localUrl}
    alt={game.name}
    class="absolute inset-0 w-full h-full object-cover"
    loading="lazy"
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
