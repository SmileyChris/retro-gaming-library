<script>
  import { getRoute } from './router.svelte.js';
  import HomePage from './HomePage.svelte';
  import PlatformPage from './PlatformPage.svelte';

  let route = $derived(getRoute());
</script>

{#if route.page === 'home'}
  <HomePage />
{:else if route.page === 'browse'}
  <PlatformPage
    platform={route.platform}
    initialGenre={route.genre}
    initialGems={route.gems}
    initialFavourites={route.favourites}
    initialHighlight={route.highlight}
  />
{:else}
  <HomePage />
{/if}
