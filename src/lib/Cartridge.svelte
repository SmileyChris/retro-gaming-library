<script>
  let {
    color,
    headerBackground = undefined,
    count = undefined,
    inserting = false,
    fading = false,
    cycle = false,
    onclick = undefined,
    children,
    class: className = "",
    style = "",
  } = $props();
</script>

<button
  {onclick}
  class="cartridge-card group {inserting ? 'inserting' : ''} {fading
    ? 'fading'
    : ''} {className}"
  style="--cartridge-color: {color}; {style}"
>
  <div class="cartridge-shell">
    <div class="cartridge-label">
      <div
        class="label-header {cycle ? 'cycling' : ''}"
        style="background: {headerBackground || color}; {cycle
          ? 'background-size: 200% auto;'
          : ''}"
      >
        {#if count !== undefined}
          <span class="label-count">{count}</span>
        {/if}
      </div>
      <div class="label-content">
        {@render children()}
      </div>
    </div>
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
    background-color: #374151; /* The cartridge plastic color */
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
    height: 100%;
  }

  .label-header {
    width: 100%;
    padding: 2px 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 18px; /* Provide some height even if empty */
  }

  .label-count {
    color: rgba(0, 0, 0, 0.5);
    font-weight: 900;
    font-size: 0.9rem;
    line-height: 1;
    opacity: 0.4; /* Slightly visible by default */
    transition: opacity 0.2s ease;
  }

  .cartridge-card:hover .label-count {
    opacity: 1; /* Show on hover */
  }

  .label-content {
    padding: 0.75rem 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
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
