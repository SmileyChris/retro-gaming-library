<script>
  import { onDestroy } from "svelte";
  import { navigate } from "./router.svelte.js";
  import { allGames } from "./data.js";

  let { onSelect = null, showAllGames = true } = $props();

  // Get unique genres with their games, plus special categories
  const regularGenres = [...new Set(allGames.flatMap((g) => g.genres))].sort();
  const allGenres = ["All Games", "Hidden Gems", ...regularGenres];

  // Filter displayed genres based on prop
  let displayedGenres = $derived(
    showAllGames ? allGenres : allGenres.filter((g) => g !== "All Games")
  );

  const genreGames = Object.fromEntries([
    ["All Games", allGames],
    ["Hidden Gems", allGames.filter((g) => g.gem)],
    ...regularGenres.map((genre) => [
      genre,
      allGames.filter((g) => g.genres.includes(genre)),
    ]),
  ]);

  // Track current image index for each genre
  let genreImageIndex = $state(
    Object.fromEntries(allGenres.map((g) => [g, 0]))
  );

  // Cycle images every 2 seconds with staggered starts
  let intervalId;
  $effect(() => {
    intervalId = setInterval(() => {
      // Pick a random genre to cycle
      const genre = allGenres[Math.floor(Math.random() * allGenres.length)];
      const games = genreGames[genre];
      if (games.length > 1) {
        genreImageIndex[genre] = (genreImageIndex[genre] + 1) % games.length;
      }
    }, 800);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });

  function getGenreColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 80%, 65%)`;
  }

  function getBoxArtUrl(game) {
    const filename =
      game.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".png";
    return `/boxart/${game.platform}/${filename}`;
  }

  // Genre scroll with momentum
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
    genreScrollContainer.style.cursor = "grabbing";
    genreScrollContainer.classList.add("dragging");
  }

  function handleGenreMouseUp() {
    genreIsDragging = false;
    if (genreScrollContainer) {
      genreScrollContainer.style.cursor = "grab";
      genreScrollContainer.classList.remove("dragging");
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
      genreVelocity = ((x - genreLastX) / dt) * 15;
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
    if (onSelect) {
      onSelect(genre);
    } else {
      // Default navigation behavior if no handler provided
      if (genre === "All Games") navigate("/platform/All");
      else if (genre === "Hidden Gems") navigate("/gems");
      else navigate(`/genre/${encodeURIComponent(genre)}`);
    }
  }
</script>

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
    {#each displayedGenres as genre}
      {@const games = genreGames[genre]}
      {@const currentGame = games[genreImageIndex[genre]]}
      {@const isSpecial = genre === "All Games" || genre === "Hidden Gems"}
      <button
        class="genre-card group cursor-pointer flex-shrink-0"
        onclick={(e) => handleGenreClick(e, genre)}
        style="--genre-color: {getGenreColor(genre)}"
      >
        <div class="genre-card-inner">
          <div class="genre-icon-container">
            {#if genre === "All Games"}
              <img
                src="/logo.png"
                alt=""
                class="w-12 h-12"
                style="filter: grayscale(1) brightness(1.5) contrast(1.2);"
              />
            {:else if genre === "Hidden Gems"}
              <span
                class="text-4xl"
                style="filter: grayscale(1) brightness(1.5);">💎</span
              >
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
          <div class="text-xl font-bold" style="color: {getGenreColor(genre)}">
            {games.length}
          </div>
        </div>
      </button>
    {/each}
  </div>
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
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
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
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 0 20px color-mix(in srgb, var(--genre-color) 30%, transparent);
    border-color: var(--genre-color);
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
