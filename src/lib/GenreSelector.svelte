<script>
  import { onDestroy } from "svelte";
  import { navigate } from "./router.svelte.js";
  import { allGames, platformConfig } from "./data.js"; // Updated import
  import Cartridge from "./Cartridge.svelte"; // New import

  import { getGenreColor } from "./utils.js";

  let {
    onSelect = null,
    onInteract,
    externalFading = false,
    showAllGames = true,
  } = $props();

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

  function getGameImage(game) {
    // Renamed from getBoxArtUrl
    const filename =
      game.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".png";
    return `/boxart/${game.platform}/${filename}`;
  }

  function getGenreCount(genre) {
    // New function
    return genreGames[genre].length;
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
  let insertingKey = $state(null);

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

  async function handleGenreClick(e, genre) {
    if (genreHasDragged) {
      e.preventDefault();
      genreHasDragged = false;
      return;
    }

    if (onInteract) onInteract();

    insertingKey = genre;
    await new Promise((resolve) => setTimeout(resolve, 300));

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
      <Cartridge
        color={getGenreColor(genre)}
        headerBackground={genre === "All Games"
          ? "linear-gradient(90deg, #c084fc, #ec4899, #ef4444, #c084fc)"
          : undefined}
        cycle={genre === "All Games"}
        count={getGenreCount(genre)}
        inserting={insertingKey === genre}
        fading={externalFading || (insertingKey && insertingKey !== genre)}
        onclick={(e) => handleGenreClick(e, genre)}
      >
        {#if isSpecial}
          <div class="genre-image-container">
            {#if genre === "All Games"}
              <img
                src={platformConfig["All"].logo}
                alt="All Games"
                class="genre-image special-logo"
                draggable="false"
              />
            {:else}
              <div class="genre-icon special">💎</div>
            {/if}
          </div>
        {:else if currentGame}
          <div class="genre-image-container">
            <img
              src={getGameImage(currentGame)}
              alt={genre}
              class="genre-image"
              loading="lazy"
              draggable="false"
            />
          </div>
        {:else}
          <div class="genre-image-container">
            <div class="genre-icon">🎮</div>
          </div>
        {/if}
        <div class="genre-name">{genre}</div>
      </Cartridge>
    {/each}
  </div>
</div>

<style>
  .genre-scroll {
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 1rem 2rem 2rem;
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

  /* New styles for content within Cartridge */
  .genre-image-container {
    width: 80px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 4px; /* Slightly tighter radius inside the black sticker */
  }

  .genre-image {
    width: 100%;
    height: 100%;
    object-fit: cover; /* Ensure images fill the box */
    filter: grayscale(0.8) brightness(1.2); /* Reduced saturation */
  }

  .genre-icon {
    font-size: 2rem;
  }

  .genre-icon.special {
    font-size: 2.5rem; /* Larger for emoji icons */
    filter: grayscale(0.8) brightness(1.2); /* Reduced saturation */
  }

  .special-logo {
    object-fit: contain;
    filter: grayscale(0.8) brightness(1.2);
    /* opacity: 0.9; removed to match platform request */
    padding: 4px;
  }

  .genre-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: #e5e7eb; /* gray-200 */
    margin-top: 0.5rem;
    text-align: center;
    line-height: 1.1;
  }
</style>
