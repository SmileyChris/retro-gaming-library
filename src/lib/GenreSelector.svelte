<script>
  import { navigate } from "./router.svelte.js";
  import { allGames, platformConfig } from "./data.js";
  import CartridgeList from "./CartridgeList.svelte";

  let {
    onSelect = null,
    onInteract,
    externalFading = false,
    showAllGames = true,
    spinTo = null,
    onSpinComplete = null,
  } = $props();

  // Get unique genres
  const regularGenres = [...new Set(allGames.flatMap((g) => g.genres))].sort();

  // Games per genre (for image cycling)
  const genreGames = Object.fromEntries([
    ["All", allGames],
    ["Hidden Gems", allGames.filter((g) => g.gem)],
    ...regularGenres.map((genre) => [
      genre,
      allGames.filter((g) => g.genres.includes(genre)),
    ]),
  ]);

  // Build items with smart props
  let items = $derived.by(() => {
    const list = [];

    if (showAllGames) {
      list.push({ platform: "All", games: genreGames["All"] });
    }

    list.push({ isGem: true, games: genreGames["Hidden Gems"] });

    list.push(
      ...regularGenres.map((g) => ({ genre: g, games: genreGames[g] }))
    );

    return list;
  });

  // Track current image index for each genre (for cycling)
  let genreImageIndex = $state(
    Object.fromEntries([
      ["All", 0],
      ["Hidden Gems", 0],
      ...regularGenres.map((g) => [g, 0]),
    ])
  );

  // Cycle images every 800ms
  $effect(() => {
    const keys = Object.keys(genreImageIndex);
    const intervalId = setInterval(() => {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const games = genreGames[key];
      if (games && games.length > 1) {
        genreImageIndex[key] = (genreImageIndex[key] + 1) % games.length;
      }
    }, 800);
    return () => clearInterval(intervalId);
  });

  function getGameImage(game) {
    const filename =
      game.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".png";
    return `/boxart/${game.platform}/${filename}`;
  }

  function getItemKey(item) {
    if (item.platform) return item.platform;
    if (item.isGem) return "Hidden Gems";
    return item.genre;
  }

  function handleSelect(key) {
    if (onSelect) {
      onSelect(key);
    } else {
      if (key === "All") navigate("/platform/All");
      else if (key === "Hidden Gems") navigate("/gems");
      else navigate(`/genre/${encodeURIComponent(key)}`);
    }
  }
</script>

{#snippet content(item)}
  {@const key = getItemKey(item)}
  {@const currentGame = item.games[genreImageIndex[key]]}
  <div class="genre-image-container">
    {#if item.platform === "All"}
      <img
        src={platformConfig["All"].logo}
        alt="All Games"
        class="genre-image special-logo"
        draggable="false"
      />
    {:else if item.isGem}
      <div class="genre-icon special">💎</div>
    {:else if currentGame}
      <img
        src={getGameImage(currentGame)}
        alt={key}
        class="genre-image"
        loading="lazy"
        draggable="false"
      />
    {:else}
      <div class="genre-icon">🎮</div>
    {/if}
  </div>
{/snippet}

<CartridgeList
  {items}
  onSelect={handleSelect}
  {onInteract}
  {externalFading}
  {spinTo}
  {onSpinComplete}
  {content}
  {getItemKey}
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
</style>
