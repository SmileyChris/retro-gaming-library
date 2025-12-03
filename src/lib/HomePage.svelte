<script>
  import { tick } from 'svelte';
  import { navigate } from './router.svelte.js';
  import { platformConfig, allGames } from './data.js';
  import { search } from './searchStore.svelte.js';
  import PlatformSelector from './PlatformSelector.svelte';

  let shouldTransition = $state(false);

  async function handleSearchInput() {
    if (search.query.trim()) {
      shouldTransition = true;
      await tick();
      navigate('/platform/All');
    }
  }

  async function pickRandomGame() {
    shouldTransition = true;
    await tick();
    const randomIndex = Math.floor(Math.random() * allGames.length);
    const randomGame = allGames[randomIndex];
    navigate(`/platform/${encodeURIComponent(randomGame.platform)}?highlight=${randomGame.id}`);
  }

  function handlePlatformClick(platform) {
    if (platform === 'Favourites') {
      navigate('/favourites');
    } else if (platform === 'Gems') {
      navigate('/gems');
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
    <div class="flex items-center gap-3">
      <button
        onclick={(e) => { e.currentTarget.querySelector('svg').classList.add('spin-once'); pickRandomGame(); }}
        class={`flex items-center justify-center w-14 h-14 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition shrink-0 ${shouldTransition ? 'vt-random-btn' : ''}`}
        title="Random game"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" onanimationend={(e) => e.target.classList.remove('spin-once')}>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
      <input
        type="search"
        placeholder="Search games..."
        bind:value={search.query}
        oninput={handleSearchInput}
        class={`w-full px-6 py-4 rounded-full bg-gray-800 border border-gray-600 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition ${shouldTransition ? 'vt-search-box' : ''}`}
      />
    </div>
  </div>

  <!-- Platform Selector -->
  <div class="w-full">
    <PlatformSelector onSelect={handlePlatformClick} />
  </div>

</div>
