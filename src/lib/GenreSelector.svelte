<script>
  import { navigate } from "./router.svelte.js";
  import { allGames, platformConfig } from "./data.js";
  import { getGenreColor } from "./utils.js";
  import CartridgeList from "./CartridgeList.svelte";

  let {
    onSelect = null,
    onInteract,
    externalFading = false,
    showAllGames = true,
    spinTo = null,
    onSpinComplete = null,
  } = $props();

  // Get unique genres with their games, plus special categories
  const regularGenres = [...new Set(allGames.flatMap((g) => g.genres))].sort();
  const allGenres = ["All Games", "Hidden Gems", ...regularGenres];

  const genreGames = Object.fromEntries([
    ["All Games", allGames],
    ["Hidden Gems", allGames.filter((g) => g.gem)],
    ...regularGenres.map((genre) => [
      genre,
      allGames.filter((g) => g.genres.includes(genre)),
    ]),
  ]);

  // Filter displayed genres based on prop
  let displayedGenres = $derived(
    showAllGames ? allGenres : allGenres.filter((g) => g !== "All Games")
  );

  // Build items for CartridgeList
  let items = $derived(
    displayedGenres.map((genre) => ({
      key: genre,
      name: genre,
      color: getGenreColor(genre),
      games: genreGames[genre],
      isSpecial: genre === "All Games" || genre === "Hidden Gems",
    }))
  );

  // Track current image index for each genre (for cycling)
  let genreImageIndex = $state(
    Object.fromEntries(allGenres.map((g) => [g, 0]))
  );

  // Cycle images every 800ms
  $effect(() => {
    const intervalId = setInterval(() => {
      const genre = allGenres[Math.floor(Math.random() * allGenres.length)];
      const games = genreGames[genre];
      if (games.length > 1) {
        genreImageIndex[genre] = (genreImageIndex[genre] + 1) % games.length;
      }
    }, 800);
    return () => clearInterval(intervalId);
  });

  function getGameImage(game) {
    const filename =
      game.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".png";
    return `/boxart/${game.platform}/${filename}`;
  }

  function handleSelect(key) {
    if (onSelect) {
      onSelect(key);
    } else {
      if (key === "All Games") navigate("/platform/All");
      else if (key === "Hidden Gems") navigate("/gems");
      else navigate(`/genre/${encodeURIComponent(key)}`);
    }
  }

  function getHeaderBackground(item) {
    if (item.key === "All Games") {
      return "linear-gradient(90deg, #c084fc, #ec4899, #ef4444, #c084fc)";
    }
    return undefined;
  }
</script>

{#snippet content(genre)}
  {#if genre.isSpecial}
    <div class="genre-image-container">
      {#if genre.key === "All Games"}
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
  {:else}
    {@const currentGame = genre.games[genreImageIndex[genre.key]]}
    {#if currentGame}
      <div class="genre-image-container">
        <img
          src={getGameImage(currentGame)}
          alt={genre.key}
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
  {/if}
  <div class="genre-name">{genre.name}</div>
{/snippet}

<CartridgeList
  {items}
  onSelect={handleSelect}
  {onInteract}
  {externalFading}
  {spinTo}
  {onSpinComplete}
  {content}
  getItemKey={(g) => g.key}
  getItemColor={(g) => g.color}
  getItemCount={(g) => g.games.length}
  {getHeaderBackground}
  shouldCycle={(g) => g.key === "All Games"}
/>

<style>
  .genre-image-container {
    width: 80px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 4px;
  }

  .genre-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(0.8) brightness(1.2);
  }

  .genre-icon {
    font-size: 2rem;
  }

  .genre-icon.special {
    font-size: 2.5rem;
    filter: grayscale(0.8) brightness(1.2);
  }

  .special-logo {
    object-fit: contain;
    filter: grayscale(0.8) brightness(1.2);
    padding: 4px;
  }

  .genre-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: #e5e7eb;
    margin-top: 0.5rem;
    text-align: center;
    line-height: 1.1;
  }
</style>
