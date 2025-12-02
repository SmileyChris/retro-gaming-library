<script>
  import { navigate } from './router.svelte.js';
  import { platformConfig, allGames } from './data.js';
  import { getSearchQuery, setSearchQuery } from './searchStore.svelte.js';
  import PlatformSelector from './PlatformSelector.svelte';

  let searchQuery = $derived(getSearchQuery());

  function handleSearchInput() {
    if (searchQuery.trim()) {
      navigate('/platform/All');
    }
  }

  function handlePlatformClick(platform) {
    if (platform === 'Favourites') {
      navigate('/favourites');
    } else {
      navigate(`/platform/${encodeURIComponent(platform)}`);
    }
  }

  // Calculate total games
  const totalGames = allGames.length;
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
  <!-- Logo -->
  <img
    src="/logo.png"
    alt="Retro Gaming Library"
    style="view-transition-name: platform-All"
    class="w-32 h-32 md:w-40 md:h-40 mb-6 drop-shadow-2xl"
  />

  <!-- Title -->
  <h1 class="retro-font text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 crt-flicker mb-2 text-center">
    RETRO GAMING LIBRARY
  </h1>
  <p class="text-gray-400 mb-8 text-center">
    {totalGames} Essential Retro Games
  </p>

  <!-- Search Bar -->
  <div class="w-full max-w-md mb-12">
    <div class="relative">
      <input
        type="search"
        placeholder="Search games..."
        value={searchQuery}
        oninput={(e) => { setSearchQuery(e.target.value); handleSearchInput(); }}
        autofocus
        style="view-transition-name: search-box"
        class="w-full px-6 py-4 rounded-full bg-gray-800 border border-gray-600 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
      />
    </div>
  </div>

  <!-- Platform Selector -->
  <div class="w-full">
    <PlatformSelector onSelect={handlePlatformClick} />
  </div>

</div>
