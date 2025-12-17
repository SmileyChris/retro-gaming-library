<script>
  import { platformConfig, allGames } from "./data.js";
  import CartridgeList from "./CartridgeList.svelte";

  let {
    onSelect,
    onInteract,
    externalFading = false,
    spinTo = null,
    onSpinComplete = null,
  } = $props();

  // Load favorites from localStorage
  let favorites = $state([]);
  if (typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem("retroLibraryFavorites");
      if (saved) {
        favorites = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load favorites");
    }
  }

  // Calculate game counts per platform
  let platformCounts = $derived.by(() => {
    const counts = {
      All: allGames.length,
      Favourites: favorites.length,
    };
    allGames.forEach((g) => {
      counts[g.platform] = (counts[g.platform] || 0) + 1;
    });
    return counts;
  });

  // Build platform list with "All" first, then Favourites if any
  let platforms = $derived.by(() => {
    const list = [
      { key: "All", name: "All Games", logo: "/logo.png", color: "#6366F1" },
    ];

    if (favorites.length > 0) {
      list.push({
        key: "Favourites",
        name: "Favourites",
        logo: null,
        icon: "🤍",
        color: "#EF4444",
      });
    }

    list.push(
      ...Object.entries(platformConfig)
        .filter(([key]) => key !== "All")
        .map(([key, config]) => ({
          key,
          name: key,
          logo:
            config.logo || `/logos/${key.toLowerCase().replace("/", "-")}.svg`,
          color: config.color,
        }))
    );

    return list;
  });

  function getHeaderBackground(item) {
    if (item.key === "All") {
      return "linear-gradient(90deg, #c084fc, #ec4899, #ef4444, #c084fc)";
    }
    return undefined;
  }
</script>

{#snippet content(platform)}
  <div class="platform-logo-container">
    {#if platform.logo}
      <img
        src={platform.logo}
        alt={platform.name}
        class="platform-logo"
        draggable="false"
        onerror={(e) => {
          e.target.style.display = "none";
          e.target.nextElementSibling.style.display = "flex";
        }}
      />
      <div
        class="platform-logo-fallback"
        style="display: none; background-color: {platform.color}"
      >
        {platformConfig[platform.key]?.icon || "🎮"}
      </div>
    {:else}
      <div class="platform-icon-only">
        {platform.icon || "🎮"}
      </div>
    {/if}
  </div>
  <div class="platform-name">{platform.name}</div>
{/snippet}

<CartridgeList
  items={platforms}
  {onSelect}
  {onInteract}
  {externalFading}
  {spinTo}
  {onSpinComplete}
  {content}
  getItemKey={(p) => p.key}
  getItemColor={(p) => p.color}
  getItemCount={(p) => platformCounts[p.key] || 0}
  {getHeaderBackground}
  shouldCycle={(p) => p.key === "All"}
/>

<style>
  .platform-logo-container {
    width: 80px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .platform-logo {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: grayscale(1) brightness(1.2);
    opacity: 0.9;
  }

  .platform-icon-only {
    font-size: 2.5rem;
    filter: grayscale(1) brightness(1.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .platform-logo-fallback {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .platform-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: #e5e7eb;
    text-align: center;
    white-space: nowrap;
  }
</style>
