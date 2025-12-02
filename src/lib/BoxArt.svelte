<script>
  import { platformConfig } from './data.js';
  import { navigate } from './router.svelte.js';

  let { game } = $props();

  function handlePlatformClick(event) {
    event.stopPropagation();
    navigate(`/platform/${encodeURIComponent(game.platform)}`);
  }

  let imgError = $state(false);
  let imgLoaded = $state(false);

  let config = $derived(platformConfig[game.platform]);
  let initials = $derived(game.name.split(' ').map(w => w[0]).join('').slice(0, 3));

  // Logic to determine box art URL
  // We prioritize the local file we downloaded
  let filename = $derived(game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png');
  let localUrl = $derived(`/boxart/${game.platform}/${filename}`);

  // Fallback to remote if needed (though we try to use local first)
  let remoteUrl = $derived((game.libretroName && config.libretro)
    ? `https://thumbnails.libretro.com/${encodeURIComponent(config.libretro).replace(/%20/g, '%20')}/Named_Boxarts/${encodeURIComponent(game.libretroName).replace(/%20/g, '%20')}.png`
    : null);

  function handleError() {
    if (!imgError) {
      // If local fails, maybe try remote? Or just show placeholder
      // For now, let's just show placeholder on error
      imgError = true;
    }
  }

  function handleLoad() {
    imgLoaded = true;
  }
</script>

<div class={`box-art relative bg-gradient-to-br ${config.gradient} rounded-lg overflow-hidden shadow-lg`}>
  {#if !imgError}
    <img
      src={localUrl}
      alt={game.name}
      class={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
      onerror={handleError}
      onload={handleLoad}
      loading="lazy"
    />
  {/if}

  {#if imgError || !imgLoaded}
    <div class="absolute inset-0 flex flex-col items-center justify-center p-2">
      <div class="scanlines absolute inset-0 pointer-events-none"></div>
      <div class="retro-font text-white text-xl md:text-2xl font-bold mb-2 opacity-90 drop-shadow-lg">
        {initials}
      </div>
      <div class="text-white/80 text-xs text-center px-2 line-clamp-2 modern-font">
        {game.name}
      </div>
    </div>
  {/if}

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
