<script>
  let { mode = $bindable() } = $props();
</script>

<div class="inline-flex rounded-lg bg-gray-800 p-1 mb-2">
  <button
    class="px-3 py-1.5 text-xs font-medium rounded-md transition {mode ===
    'platforms'
      ? 'bg-gray-700 text-white'
      : 'text-gray-400 hover:text-white'}"
    onclick={() => (mode = "platforms")}
  >
    Platforms
  </button>
  <button
    class="px-3 py-1.5 text-xs font-medium rounded-md transition {mode ===
    'genres'
      ? 'bg-gray-700 text-white'
      : 'text-gray-400 hover:text-white'}"
    onclick={() => (mode = "genres")}
  >
    Genres
  </button>
</div>
