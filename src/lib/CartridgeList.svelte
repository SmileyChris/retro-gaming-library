<script>
  import Cartridge from "./Cartridge.svelte";

  let {
    items = [],
    onSelect = null,
    onInteract = null,
    externalFading = false,
    spinTo = null,
    onSpinComplete = null,
    content,
    getItemKey = (item) => item.key,
    getItemColor = (item) => item.color,
    getItemCount = null,
    getHeaderBackground = null,
    shouldCycle = null,
  } = $props();

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

  // Spin animation state
  let spinHighlight = $state(null);
  let isSpinning = $state(false);

  // Watch for spinTo changes to trigger animation
  $effect(() => {
    if (spinTo && !isSpinning) {
      startSpinAnimation(spinTo);
    }
  });

  function startSpinAnimation(targetKey) {
    isSpinning = true;

    // Get spinnable items (exclude first item which is usually "All")
    const spinItems = items.slice(1);
    const spinKeys = spinItems.map(getItemKey);

    // Find target index
    const targetIndex = spinKeys.indexOf(targetKey);
    if (targetIndex === -1) {
      // Target not found, skip animation
      isSpinning = false;
      if (onSpinComplete) onSpinComplete(targetKey);
      return;
    }

    // Fixed duration animation
    const totalDuration = 1000; // Always 1 second
    const fullSpins = 1;
    const itemCount = spinKeys.length;
    const totalSteps = fullSpins * itemCount + targetIndex;

    // Pre-calculate intervals to hit exact duration with easing
    const intervals = [];
    let sumWeights = 0;
    for (let i = 0; i < totalSteps; i++) {
      const progress = i / totalSteps;
      // Weight increases as we progress (slower at end)
      const weight = 1 + Math.pow(progress, 4) * 8;
      intervals.push(weight);
      sumWeights += weight;
    }
    // Normalize to hit target duration
    for (let i = 0; i < intervals.length; i++) {
      intervals[i] = (intervals[i] / sumWeights) * totalDuration;
    }

    let step = 0;

    function animateStep() {
      const currentIndex = step % itemCount;
      spinHighlight = spinKeys[currentIndex];

      if (step < totalSteps) {
        const interval = intervals[step];
        step++;
        setTimeout(animateStep, interval);
      } else {
        // Animation complete - keep highlight, pause briefly, then insert
        setTimeout(() => {
          spinHighlight = null;
          insertingKey = targetKey;

          // Keep isSpinning true a bit longer to prevent transition flicker
          setTimeout(() => {
            isSpinning = false;
            if (onSpinComplete) onSpinComplete(targetKey);
          }, 300);
        }, 150);
      }
    }

    animateStep();
  }

  function handleMouseDown(e) {
    if (momentumId) cancelAnimationFrame(momentumId);
    isDragging = true;
    hasDragged = false;
    startX = e.pageX - scrollContainer.offsetLeft;
    lastX = startX;
    lastTime = Date.now();
    scrollLeft = scrollContainer.scrollLeft;
    velocity = 0;
  }

  function handleMouseUp() {
    isDragging = false;
    if (scrollContainer) {
      if (Math.abs(velocity) > 0.5) {
        applyMomentum();
      }
    }
  }

  function applyMomentum() {
    velocity *= 0.95;
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

  async function handleClick(e, item) {
    if (hasDragged) {
      e.preventDefault();
      hasDragged = false;
      return;
    }

    if (onInteract) onInteract();

    const key = getItemKey(item);
    insertingKey = key;
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (onSelect) onSelect(key);
  }
</script>

<div
  class="selector-scroll"
  class:dragging={isDragging}
  class:spinning={isSpinning}
  bind:this={scrollContainer}
  onmousedown={handleMouseDown}
  onmouseup={handleMouseUp}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  role="list"
>
  <div class="selector-scroll-inner">
    {#each items as item}
      {@const key = getItemKey(item)}
      {@const color = getItemColor(item)}
      {@const count = getItemCount ? getItemCount(item) : undefined}
      {@const headerBg = getHeaderBackground ? getHeaderBackground(item) : undefined}
      {@const cycle = shouldCycle ? shouldCycle(item) : false}
      <Cartridge
        {color}
        headerBackground={headerBg}
        {cycle}
        {count}
        inserting={insertingKey === key}
        fading={externalFading || (insertingKey && insertingKey !== key)}
        class={spinHighlight === key ? 'spin-highlighted' : ''}
        onclick={(e) => handleClick(e, item)}
      >
        {@render content(item)}
      </Cartridge>
    {/each}
  </div>
</div>

<style>
  .selector-scroll {
    overflow-x: auto;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 1rem 2rem 2rem;
    cursor: grab;
    user-select: none;
    scroll-behavior: smooth;
  }

  .selector-scroll.dragging {
    scroll-behavior: auto;
    scroll-snap-type: none;
    cursor: grabbing;
  }

  .selector-scroll::-webkit-scrollbar {
    display: none;
  }

  .selector-scroll-inner {
    display: flex;
    gap: 1rem;
    place-self: center;
    max-width: 90vw;
  }

  /* lg breakpoint and above: wrap instead of scroll */
  @media (min-width: 1024px) {
    .selector-scroll {
      overflow-x: visible;
      scroll-snap-type: none;
      cursor: default;
      display: flex;
      justify-content: center;
    }

    .selector-scroll-inner {
      flex-wrap: wrap;
      justify-content: center;
      max-width: 900px;
    }
  }

  /* During spin, disable all cartridge-shell transitions for instant highlight switching */
  .spinning :global(.cartridge-shell) {
    transition: none !important;
  }

  /* Spin highlight effect - glow only */
  :global(.spin-highlighted .cartridge-shell) {
    box-shadow:
      0 4px 6px rgba(0, 0, 0, 0.3),
      0 0 20px var(--cartridge-color),
      0 0 40px color-mix(in srgb, var(--cartridge-color) 40%, transparent) !important;
  }
</style>
