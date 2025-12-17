<script>
  import { platformConfig } from "./data.js";
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

  // Build platform list with "All" first, then Favourites if any
  let platforms = $derived.by(() => {
    const list = [{ platform: "All" }];

    if (favorites.length > 0) {
      list.push({
        key: "Favourites",
        platform: "Favourites",
        count: favorites.length,
        color: "#EF4444",
      });
    }

    list.push(
      ...Object.entries(platformConfig)
        .filter(([key]) => key !== "All")
        .map(([key]) => ({ platform: key }))
    );

    return list;
  });
</script>

{#snippet content(item)}
  {@const config = platformConfig[item.platform]}
  {@const logo = config?.logo}
  <div class="platform-logo-container">
    {#if item.platform === "Favourites"}
      <div class="platform-icon-only">🤍</div>
    {:else if logo}
      <img
        src={logo}
        alt={item.platform}
        class="platform-logo"
        draggable="false"
        onerror={(e) => {
          e.target.style.display = "none";
          e.target.nextElementSibling.style.display = "flex";
        }}
      />
      <div
        class="platform-logo-fallback"
        style="display: none; background-color: {config?.color}"
      >
        {config?.icon || "🎮"}
      </div>
    {:else}
      <div class="platform-icon-only">
        {config?.icon || "🎮"}
      </div>
    {/if}
  </div>
{/snippet}

<CartridgeList
  items={platforms}
  {onSelect}
  {onInteract}
  {externalFading}
  {spinTo}
  {onSpinComplete}
  {content}
  getItemKey={(p) => p.platform}
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
</style>
