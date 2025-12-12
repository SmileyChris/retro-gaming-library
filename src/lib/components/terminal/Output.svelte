<script>
  let { history = [] } = $props();

  // Auto-scroll to bottom when history updates
  let container;
  $effect(() => {
    if (history.length && container) {
      container.scrollTop = container.scrollHeight;
    }
  });
</script>

<div
  class="flex-1 overflow-y-auto p-4 font-mono text-lg space-y-2 scrollbar-none"
  bind:this={container}
>
  {#each history as entry (entry.id)}
    <div class={`log-${entry.type} whitespace-pre-wrap max-w-3xl`}>
      {entry.text}
    </div>
  {/each}
</div>

<style>
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
</style>
