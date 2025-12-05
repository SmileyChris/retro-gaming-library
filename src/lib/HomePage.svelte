<script>
  import { tick, onDestroy } from 'svelte';
  import { navigate } from './router.svelte.js';
  import { platformConfig, allGames } from './data.js';
  import { search } from './searchStore.svelte.js';
  import { browse } from './browseStore.svelte.js';
  import PlatformSelector from './PlatformSelector.svelte';

  let shouldTransition = $state(false);

  // Get unique genres with their games, plus special categories
  const regularGenres = [...new Set(allGames.flatMap(g => g.genres))].sort();
  const allGenres = ['All Games', 'Hidden Gems', ...regularGenres];
  const genreGames = Object.fromEntries([
    ['All Games', allGames],
    ['Hidden Gems', allGames.filter(g => g.gem)],
    ...regularGenres.map(genre => [genre, allGames.filter(g => g.genres.includes(genre))])
  ]);

  // Track current image index for each genre
  let genreImageIndex = $state(Object.fromEntries(allGenres.map(g => [g, 0])));

  // Cycle images every 2 seconds with staggered starts
  let intervalId;
  $effect(() => {
    if (browse.mode === 'genres') {
      intervalId = setInterval(() => {
        // Pick a random genre to cycle
        const genre = allGenres[Math.floor(Math.random() * allGenres.length)];
        const games = genreGames[genre];
        if (games.length > 1) {
          genreImageIndex[genre] = (genreImageIndex[genre] + 1) % games.length;
        }
      }, 800);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });

  function getBoxArtUrl(game) {
    const filename = game.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
    return `/boxart/${game.platform}/${filename}`;
  }

  // Genre scroll with momentum (same as PlatformSelector)
  let genreScrollContainer = $state(null);
  let genreIsDragging = $state(false);
  let genreHasDragged = $state(false);
  let genreStartX = $state(0);
  let genreScrollLeft = $state(0);
  let genreVelocity = $state(0);
  let genreLastX = $state(0);
  let genreLastTime = $state(0);
  let genreMomentumId = $state(null);

  function handleGenreMouseDown(e) {
    if (genreMomentumId) cancelAnimationFrame(genreMomentumId);
    genreIsDragging = true;
    genreHasDragged = false;
    genreStartX = e.pageX - genreScrollContainer.offsetLeft;
    genreLastX = genreStartX;
    genreLastTime = Date.now();
    genreScrollLeft = genreScrollContainer.scrollLeft;
    genreVelocity = 0;
    genreScrollContainer.style.cursor = 'grabbing';
    genreScrollContainer.classList.add('dragging');
  }

  function handleGenreMouseUp() {
    genreIsDragging = false;
    if (genreScrollContainer) {
      genreScrollContainer.style.cursor = 'grab';
      genreScrollContainer.classList.remove('dragging');
      if (Math.abs(genreVelocity) > 0.5) {
        applyGenreMomentum();
      }
    }
  }

  function applyGenreMomentum() {
    genreVelocity *= 0.95;
    if (Math.abs(genreVelocity) < 0.5) return;
    genreScrollContainer.scrollLeft -= genreVelocity;
    genreMomentumId = requestAnimationFrame(applyGenreMomentum);
  }

  function handleGenreMouseMove(e) {
    if (!genreIsDragging) return;
    e.preventDefault();
    genreHasDragged = true;
    const x = e.pageX - genreScrollContainer.offsetLeft;
    const now = Date.now();
    const dt = now - genreLastTime;
    if (dt > 0) {
      genreVelocity = (x - genreLastX) / dt * 15;
    }
    genreLastX = x;
    genreLastTime = now;
    const walk = (x - genreStartX) * 1.5;
    genreScrollContainer.scrollLeft = genreScrollLeft - walk;
  }

  function handleGenreMouseLeave() {
    if (genreIsDragging) {
      handleGenreMouseUp();
    }
  }

  function handleGenreClick(e, genre) {
    if (genreHasDragged) {
      e.preventDefault();
      genreHasDragged = false;
      return;
    }
    if (genre === 'All Games') navigate('/platform/All');
    else if (genre === 'Hidden Gems') navigate('/gems');
    else navigate(`/genre/${encodeURIComponent(genre)}`);
  }

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

    if (browse.mode === 'genres') {
      // Pick a random genre from this game's genres
      const randomGenre = randomGame.genres[Math.floor(Math.random() * randomGame.genres.length)];
      navigate(`/genre/${encodeURIComponent(randomGenre)}?highlight=${randomGame.id}`);
    } else {
      navigate(`/platform/${encodeURIComponent(randomGame.platform)}?highlight=${randomGame.id}`);
    }
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

  <!-- Toggle (desktop only) -->
  <div class="hidden lg:flex justify-center mb-6">
    <div class="inline-flex rounded-lg bg-gray-800 p-1">
      <button
        class="px-3 py-1.5 text-xs font-medium rounded-md transition {browse.mode === 'platforms' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}"
        onclick={() => browse.mode = 'platforms'}
      >
        Platforms
      </button>
      <button
        class="px-3 py-1.5 text-xs font-medium rounded-md transition {browse.mode === 'genres' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}"
        onclick={() => browse.mode = 'genres'}
      >
        Genres
      </button>
    </div>
  </div>

  <!-- Mobile: Show both platforms and genres -->
  <div class="lg:hidden w-full">
    <PlatformSelector onSelect={handlePlatformClick} />
    <div
      class="genre-scroll"
      bind:this={genreScrollContainer}
      onmousedown={handleGenreMouseDown}
      onmouseup={handleGenreMouseUp}
      onmousemove={handleGenreMouseMove}
      onmouseleave={handleGenreMouseLeave}
      role="list"
    >
      <div class="genre-scroll-inner">
        {#each allGenres.filter(g => g !== 'All Games') as genre}
          {@const games = genreGames[genre]}
          {@const currentGame = games[genreImageIndex[genre]]}
          {@const isSpecial = genre === 'Hidden Gems'}
          <button
            class="genre-card group cursor-pointer flex-shrink-0"
            onclick={(e) => handleGenreClick(e, genre)}
          >
            <div class="genre-card-inner">
              <div class="genre-icon-container">
                {#if isSpecial}
                  <span class="text-4xl" style="filter: grayscale(1) brightness(1.5);">💎</span>
                {:else}
                  <img
                    src={getBoxArtUrl(currentGame)}
                    alt=""
                    class="w-full h-full object-cover rounded-lg"
                    style="filter: grayscale(1) brightness(1.5) contrast(1.2);"
                  />
                {/if}
              </div>
              <div class="text-xs font-semibold text-gray-200">{genre}</div>
              <div class="text-xl font-bold text-purple-400">{games.length}</div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Desktop: Toggle between platforms and genres -->
  {#if browse.mode === 'platforms'}
    <div class="hidden lg:block w-full">
      <PlatformSelector onSelect={handlePlatformClick} />
    </div>
  {:else}
    <div class="hidden lg:block w-full">
      <div
        class="genre-scroll"
        bind:this={genreScrollContainer}
        onmousedown={handleGenreMouseDown}
        onmouseup={handleGenreMouseUp}
        onmousemove={handleGenreMouseMove}
        onmouseleave={handleGenreMouseLeave}
        role="list"
      >
        <div class="genre-scroll-inner">
          {#each allGenres as genre}
            {@const games = genreGames[genre]}
            {@const currentGame = games[genreImageIndex[genre]]}
            {@const isSpecial = genre === 'All Games' || genre === 'Hidden Gems'}
            <button
              class="genre-card group cursor-pointer flex-shrink-0"
              onclick={(e) => handleGenreClick(e, genre)}
            >
              <div class="genre-card-inner">
                <div class="genre-icon-container">
                  {#if genre === 'All Games'}
                    <img src="/logo.png" alt="" class="w-12 h-12" style="filter: grayscale(1) brightness(1.5) contrast(1.2);" />
                  {:else if genre === 'Hidden Gems'}
                    <span class="text-4xl" style="filter: grayscale(1) brightness(1.5);">💎</span>
                  {:else}
                    <img
                      src={getBoxArtUrl(currentGame)}
                      alt=""
                      class="w-full h-full object-cover rounded-lg"
                      style="filter: grayscale(1) brightness(1.5) contrast(1.2);"
                    />
                  {/if}
                </div>
                <div class="text-xs font-semibold text-gray-200">{genre}</div>
                <div class="text-xl font-bold text-purple-400">{games.length}</div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

</div>

<style>
  .genre-scroll {
    overflow-x: auto;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 1rem 2rem;
    cursor: grab;
    user-select: none;
    scroll-behavior: smooth;
  }

  .genre-scroll.dragging {
    scroll-behavior: auto;
    scroll-snap-type: none;
  }

  .genre-scroll::-webkit-scrollbar {
    display: none;
  }

  .genre-scroll-inner {
    display: flex;
    gap: 1rem;
    place-self: center;
    max-width: 90vw;
  }

  /* lg breakpoint and above: wrap instead of scroll */
  @media (min-width: 1024px) {
    .genre-scroll {
      overflow-x: visible;
      scroll-snap-type: none;
      cursor: default;
      display: flex;
      justify-content: center;
    }

    .genre-scroll-inner {
      flex-wrap: wrap;
      justify-content: center;
      max-width: 980px;
    }
  }

  .genre-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .genre-card:hover {
    transform: translateY(-4px);
  }

  .genre-card-inner {
    width: 120px;
    padding: 1rem;
    background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
    border: 2px solid #374151;
    border-radius: 12px;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .genre-card:hover .genre-card-inner {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.3);
    border-color: #a855f7;
  }

  .genre-icon-container {
    width: 80px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
  }

</style>
