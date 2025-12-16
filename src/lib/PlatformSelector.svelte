<script>
  import { platformConfig, allGames } from "./data.js";
  import Cartridge from "./Cartridge.svelte";

  let { onSelect } = $props();

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

  // Drag to scroll with momentum
  let scrollContainer = $state(null);
  let isDragging = $state(false);
  let hasDragged = $state(false);
  let startX = $state(0);
  let scrollLeft = $state(0);
  let velocity = $state(0);
  let lastX = $state(0);
  let lastTime = $state(0);
  let momentumId = $state(null);
  let insertingKey = $state(null);

  function handleMouseDown(e) {
    if (momentumId) cancelAnimationFrame(momentumId);
    isDragging = true;
    hasDragged = false;
    startX = e.pageX - scrollContainer.offsetLeft;
    lastX = startX;
    lastTime = Date.now();
    scrollLeft = scrollContainer.scrollLeft;
    velocity = 0;
    scrollContainer.style.cursor = "grabbing";
    scrollContainer.classList.add("dragging");
  }

  function handleMouseUp() {
    isDragging = false;
    if (scrollContainer) {
      scrollContainer.style.cursor = "grab";
      scrollContainer.classList.remove("dragging");
      // Apply momentum
      if (Math.abs(velocity) > 0.5) {
        applyMomentum();
      }
    }
  }

  function applyMomentum() {
    velocity *= 0.95; // friction
    if (Math.abs(velocity) < 0.5) return;
    scrollContainer.scrollLeft -= velocity;
    momentumId = requestAnimationFrame(applyMomentum);
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    hasDragged = true;
    const x = e.pageX - scrollContainer.offsetLeft;
    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) {
      velocity = ((x - lastX) / dt) * 15;
    }
    lastX = x;
    lastTime = now;
    const walk = (x - startX) * 1.5;
    scrollContainer.scrollLeft = scrollLeft - walk;
  }

  function handleMouseLeave() {
    if (isDragging) {
      handleMouseUp();
    }
  }

  async function handleClick(e, platform) {
    if (hasDragged) {
      e.preventDefault();
      hasDragged = false;
      return;
    }
    insertingKey = platform.key;
    await new Promise((resolve) => setTimeout(resolve, 300));
    onSelect(platform.key);
  }
</script>

<div
  class="platform-scroll"
  bind:this={scrollContainer}
  onmousedown={handleMouseDown}
  onmouseup={handleMouseUp}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  role="list"
>
  <div class="platform-scroll-inner">
    {#each platforms as platform}
      <Cartridge
        color={platform.color}
        headerBackground={platform.key === "All"
          ? "linear-gradient(90deg, #c084fc, #ec4899, #ef4444, #c084fc)"
          : undefined}
        cycle={platform.key === "All"}
        count={platformCounts[platform.key] || 0}
        inserting={insertingKey === platform.key}
        fading={insertingKey && insertingKey !== platform.key}
        onclick={(e) => handleClick(e, platform)}
      >
        <div class="platform-logo-container">
          {#if platform.logo}
            <img
              src={platform.logo}
              alt={platform.name}
              class="platform-logo"
              draggable="false"
              onerror={(e) => {
                // Fallback to emoji/text if logo fails to load
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
      </Cartridge>
    {/each}
  </div>
</div>

<style>
  .platform-scroll {
    overflow-x: auto;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 1rem 2rem;
    cursor: grab;
    user-select: none;
    scroll-behavior: smooth;
  }

  .platform-scroll.dragging {
    scroll-behavior: auto;
    scroll-snap-type: none;
  }

  .platform-scroll::-webkit-scrollbar {
    display: none;
  }

  .platform-scroll-inner {
    display: flex;
    gap: 1rem;
    place-self: center;
    max-width: 90vw;
  }

  /* lg breakpoint and above: wrap instead of scroll */
  @media (min-width: 1024px) {
    .platform-scroll {
      overflow-x: visible;
      scroll-snap-type: none;
      cursor: default;
      display: flex;
      justify-content: center;
    }

    .platform-scroll-inner {
      flex-wrap: wrap;
      justify-content: center;
      max-width: 820px;
    }
  }

  /* New styles for content within Cartridge */
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
    filter: grayscale(1) brightness(1.2); /* Desaturated look */
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

  .platform-count {
    /* Removed, replaced by label-header/label-count */
  }
</style>
