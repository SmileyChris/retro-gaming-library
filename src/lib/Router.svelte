<script>
  import { getRoute } from "./router.svelte.js";
  import HomePage from "./HomePage.svelte";
  import PlatformPage from "./PlatformPage.svelte";
  import GameDetailPage from "./GameDetailPage.svelte";

  let route = $derived(getRoute());
</script>

{#if route.page === "home"}
  <HomePage search={route.search || ""} />
{:else if route.page === "browse"}
  <PlatformPage
    platform={route.platform}
    initialGenre={route.genre}
    initialGems={route.gems}
    initialFavourites={route.favourites}
    initialHighlight={route.highlight}
    search={route.search || ""}
  />
{:else if route.page === "game"}
  <GameDetailPage gameId={route.gameId} />
{:else}
  <HomePage />
{/if}
