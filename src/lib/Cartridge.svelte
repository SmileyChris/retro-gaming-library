<script>
  import { platformConfig, allGames } from "./data.js";
  import { getGenreColor } from "./utils.js";

  let {
    // Smart props - pass one of these to auto-configure
    platform = undefined,
    genre = undefined,
    isGem = false,
    // Manual overrides (optional when using smart props)
    color: colorOverride = undefined,
    shellColor: shellColorOverride = undefined,
    headerBackground = undefined,
    title: titleOverride = undefined,
    count: countOverride = undefined,
    // Animation/state props
    inserting = false,
    fading = false,
    cycle: cycleOverride = undefined,
    onclick = undefined,
    children,
    class: className = "",
    style = "",
  } = $props();

  // Derive values based on platform/genre/isGem
  let color = $derived.by(() => {
    if (colorOverride) return colorOverride;
    if (platform) return platformConfig[platform]?.color || "#6366F1";
    if (isGem) return getGenreColor("Hidden Gems");
    if (genre) return getGenreColor(genre);
    return "#6366F1";
  });

  let shellColor = $derived.by(() => {
    if (shellColorOverride) return shellColorOverride;
    if (platform) return "#475569"; // Slate for platforms
    return "#374151"; // Gray for genres/gems
  });

  let title = $derived.by(() => {
    if (titleOverride) return titleOverride;
    if (platform) return platform;
    if (isGem) return "Hidden Gem";
    if (genre) return genre;
    return "";
  });

  let count = $derived.by(() => {
    if (countOverride !== undefined) return countOverride;
    if (platform === "All") return allGames.length;
    if (platform) return allGames.filter((g) => g.platform === platform).length;
    if (isGem) return allGames.filter((g) => g.gem).length;
    if (genre) return allGames.filter((g) => g.genres.includes(genre)).length;
    return undefined;
  });

  let cycle = $derived.by(() => {
    if (cycleOverride !== undefined) return cycleOverride;
    if (platform === "All") return true;
    return false;
  });

  let derivedHeaderBackground = $derived.by(() => {
    if (headerBackground) return headerBackground;
    if (platform === "All") {
      return "linear-gradient(90deg, #c084fc, #ec4899, #ef4444, #c084fc)";
    }
    return undefined;
  });
</script>

<button
  {onclick}
  class="cartridge-card group {inserting ? 'inserting' : ''} {fading
    ? 'fading'
    : ''} {className}"
  style="--cartridge-color: {color}; --shell-color: {shellColor}; {style}"
>
  <div class="cartridge-shell">
    <div class="cartridge-label">
      <div
        class="label-header {cycle ? 'cycling' : ''}"
        style="background: {derivedHeaderBackground || color}; {cycle
          ? 'background-size: 200% auto;'
          : ''}"
      >
        <span class="label-title">{title}</span>
      </div>
      <div class="label-content">
        {@render children()}
      </div>
    </div>
    {#if count !== undefined}
      <span class="cart-count">{count}</span>
    {/if}
  </div>
</button>

<style>
  .cartridge-card {
    flex-shrink: 0;
    scroll-snap-align: center;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    background: transparent;
    border: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .cartridge-card:hover {
    transform: translateY(-4px);
  }

  /* Cartridge Design */
  .cartridge-shell {
    width: 120px;
    background-color: var(--shell-color); /* The cartridge plastic color */
    padding: 6px;
    padding-bottom: 24px; /* Thicker chin */
    border-radius: 8px 8px 16px 16px;
    position: relative;
    transition: all 0.2s ease;
    box-shadow:
      inset 0 2px 4px rgba(255, 255, 255, 0.1),
      0 4px 6px rgba(0, 0, 0, 0.3);
  }

  /* The downward triangle notch */
  .cartridge-shell::after {
    content: "";
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent; /* Wider notch */
    border-right: 10px solid transparent;
    border-top: 10px solid rgba(0, 0, 0, 0.3);
    transition: border-top-color 0.2s ease;
  }

  .cartridge-label {
    background: #000000;
    border-radius: 6px; /* Rounded internal sticker edges */
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .label-header {
    width: 100%;
    padding: 6px 2px;
    margin-bottom: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 24px;
  }

  .label-title {
    color: rgba(0, 0, 0, 0.85);
    font-weight: 700;
    font-size: 0.7rem;
    line-height: 1.1;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .label-content {
    padding: 0.5rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 90px;
    width: 100%;
  }

  .cart-count {
    position: absolute;
    bottom: 6px;
    right: 12px;
    color: rgba(0, 0, 0, 0.3);
    font-weight: 700;
    font-size: 0.8rem;
    line-height: 1;
    transition: color 0.2s ease;
  }

  .cartridge-card:hover .cart-count {
    color: #000;
  }

  /* Hover Effects */
  .cartridge-card:hover .cartridge-shell {
    box-shadow:
      0 8px 15px rgba(0, 0, 0, 0.5),
      0 6px 15px color-mix(in srgb, var(--cartridge-color) 70%, transparent);
    transform: translateY(-2px);
  }

  .cartridge-card:hover .cartridge-shell::after {
    border-top-color: rgba(0, 0, 0, 0.3);
  }

  /* Animation States */
  .cartridge-card.inserting .cartridge-shell {
    animation: insertCartridge 0.3s cubic-bezier(0.55, 0.055, 0.675, 0.19)
      forwards;
    box-shadow: none !important;
    z-index: 999;
  }

  .cartridge-card.fading {
    opacity: 0;
    transform: scale(0.95);
    pointer-events: none;
    transition: all 0.3s ease;
  }

  @keyframes insertCartridge {
    0% {
      transform: translateY(-2px);
      opacity: 1;
    }
    100% {
      transform: translateY(60px);
      opacity: 0.8;
    }
  }

  /* Gradient Cycling Animation */
  .cartridge-card:hover .label-header.cycling {
    animation: gradientCycle 2s linear infinite;
  }

  @keyframes gradientCycle {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 200% 50%;
    }
  }
</style>
