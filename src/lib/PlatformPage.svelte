<script lang="ts">
  import { untrack, tick } from "svelte";
  import GameCard from "./GameCard.svelte";
  import ViewToggle from "./ViewToggle.svelte";
  import { platformConfig, allGames } from "./data.js";
  import { navigate } from "./router.svelte.js";
  import { getGenreColor } from "./utils.js";

  let {
    platform = "All",
    initialGenre = null,
    initialGems = false,
    initialFavourites = false,
    initialHighlight = null,
    search = "",
  } = $props();

  // Element refs
  let searchInput = $state(null);
  let randomBtnSvg = $state(null);
  $effect(() => {
    if (searchInput && untrack(() => search)) {
      searchInput.focus();
    }
  });

  // Get unique genres (flattened from arrays)
  const allGenres = [...new Set(allGames.flatMap((g) => g.genres))].sort();
  let favorites = $state([]);

  // Load favorites from localStorage on init
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

  // Precompute Set for O(1) lookups (used many times per render)
  let favoritesSet = $derived(new Set(favorites));

  // Save favorites to localStorage using $effect
  $effect(() => {
    const currentFavorites = favorites;
    untrack(() => {
      try {
        localStorage.setItem(
          "retroLibraryFavorites",
          JSON.stringify(currentFavorites)
        );
      } catch (e) {
        console.warn("Could not save favorites");
      }
    });
  });

  function toggleFavorite(gameId) {
    const update = () => {
      if (favoritesSet.has(gameId)) {
        favorites = favorites.filter((id) => id !== gameId);
      } else {
        favorites = [...favorites, gameId];
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(update);
    } else {
      update();
    }
  }

  // Filtered and sorted games using $derived (sorted once, not re-sorted on fav change)
  let filteredAndSortedGames = $derived.by(() => {
    const query = search.toLowerCase();
    let games = allGames.filter((game) => {
      const matchesPlatform = platform === "All" || game.platform === platform;
      const matchesGenre = !initialGenre || game.genres.includes(initialGenre);
      const matchesGems = !initialGems || game.gem;
      const matchesFavorites = !initialFavourites || favoritesSet.has(game.id);
      const matchesSearch =
        query === "" ||
        game.name.toLowerCase().includes(query) ||
        game.notes.toLowerCase().includes(query);
      return (
        matchesPlatform &&
        matchesGenre &&
        matchesGems &&
        matchesFavorites &&
        matchesSearch
      );
    });

    // Sort: name matches first, then alphabetically within each group
    if (query) {
      games.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(query);
        const bNameMatch = b.name.toLowerCase().includes(query);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      games.sort((a, b) => a.name.localeCompare(b.name));
    }
    return games;
  });

  // Stats using $derived
  let stats = $derived.by(() => {
    const platformCounts = {};
    allGames.forEach((g) => {
      platformCounts[g.platform] = (platformCounts[g.platform] || 0) + 1;
    });
    return platformCounts;
  });

  // Get platform info
  let platformInfo = $derived(platformConfig[platform] || null);
  let platformColor = $derived(platformInfo?.color || "#6366F1");
  let platformIcon = $derived(platformInfo?.icon || "🎮");

  // Page title logic
  let pageTitle = $derived.by(() => {
    if (initialFavourites) return "Favourites";
    if (initialGems) return "Hidden Gems";
    if (initialGenre) return initialGenre;
    if (platform === "All") return "All Games";
    return platform;
  });

  let pageSubtitle = $derived.by(() => {
    if (initialFavourites) return "Your saved games";
    if (initialGems) return "Overlooked classics worth discovering";
    if (initialGenre) return "Games across all platforms";
    return null;
  });

  let gameCount = $derived(filteredAndSortedGames.length);

  // Get category name for "no results" messaging
  let categoryName = $derived.by(() => {
    if (initialFavourites) return "Favourites";
    if (initialGems) return "Hidden Gems";
    if (initialGenre) return initialGenre;
    if (platform !== "All") return platform;
    return null;
  });

  // Get matches across all games (for "other matches" feature)
  let allSearchMatches = $derived.by(() => {
    if (!search) return [];
    const query = search.toLowerCase();
    return allGames
      .filter(
        (game) =>
          game.name.toLowerCase().includes(query) ||
          game.notes.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(query);
        const bNameMatch = b.name.toLowerCase().includes(query);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return a.name.localeCompare(b.name);
      });
  });

  // Matches outside current category
  let otherCategoryMatches = $derived.by(() => {
    if (!search || !categoryName) return [];
    const currentIds = new Set(filteredAndSortedGames.map((g) => g.id));
    return allSearchMatches.filter((g) => !currentIds.has(g.id));
  });

  let otherMatchesCount = $derived(otherCategoryMatches.length);

  // Get other matches for display when no results in current category
  let otherMatches = $derived.by(() => {
    if (filteredAndSortedGames.length > 0 || !categoryName) return [];
    return allSearchMatches;
  });

  // Count favorites that match current filters including search
  let matchingFavorites = $derived.by(() => {
    return allGames.filter((game) => {
      const matchesPlatform = platform === "All" || game.platform === platform;
      const matchesGenre = !initialGenre || game.genres.includes(initialGenre);
      const matchesGems = !initialGems || game.gem;
      const matchesSearch =
        search === "" ||
        game.name.toLowerCase().includes(search.toLowerCase()) ||
        game.notes.toLowerCase().includes(search.toLowerCase());
      return (
        matchesPlatform &&
        matchesGenre &&
        matchesGems &&
        matchesSearch &&
        favoritesSet.has(game.id)
      );
    }).length;
  });

  // Footer toggle - default to genres when on genre page, platforms otherwise
  let footerMode = $state(initialGenre ? "genres" : "platforms");

  // Random game selection
  let highlightedGameId = $state(null);
  let isAnimating = $state(false);
  let highlightTimeout = null;

  function pickRandomGame() {
    if (filteredAndSortedGames.length === 0) return;

    // Clear any pending timeout
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }

    // Reset animations by clearing highlight first
    highlightedGameId = null;
    isAnimating = false;

    // Wait for DOM to clear animations, then start new one
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const randomIndex = Math.floor(
          Math.random() * filteredAndSortedGames.length
        );
        const randomGame = filteredAndSortedGames[randomIndex];
        highlightedGameId = randomGame.id;
        isAnimating = true;

        // Update URL with highlight param
        const currentHash = window.location.hash;
        const [basePath, queryString] = currentHash.split("?");
        const params = new URLSearchParams(queryString || "");
        params.set("highlight", randomGame.id);

        window.history.replaceState(
          null,
          "",
          `${basePath}?${params.toString()}`
        );

        // Scroll to the game card
        tick().then(() => {
          const element = document.querySelector(
            `[data-game-id="${randomGame.id}"]`
          );
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });

        // Clear animation flag after animation (but keep highlight)
        highlightTimeout = setTimeout(() => {
          isAnimating = false;
          highlightTimeout = null;
        }, 6000);
      });
    });
  }

  // Reset highlight when route changes without a highlight param
  $effect(() => {
    // Track route-related props to detect navigation
    platform;
    initialGenre;
    initialGems;
    initialFavourites;

    if (!initialHighlight) {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        highlightTimeout = null;
      }
      highlightedGameId = null;
      isAnimating = false;
    }
  });

  // Handle initial highlight from navigation
  $effect(() => {
    if (initialHighlight) {
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      // Small delay to ensure DOM is fully rendered with filtered games
      setTimeout(() => {
        // Check if highlighted game is in the current filtered list
        const gameInList = filteredAndSortedGames.some(
          (g) => g.id === initialHighlight
        );
        if (!gameInList) {
          // Redirect to All with highlight
          navigate(`/platform/All?highlight=${initialHighlight}`);
          return;
        }

        highlightedGameId = initialHighlight;
        isAnimating = true;

        // Spin the random button
        if (randomBtnSvg) {
          randomBtnSvg.classList.add("spin-once");
        }

        tick().then(() => {
          const element = document.querySelector(
            `[data-game-id="${initialHighlight}"]`
          );
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
        highlightTimeout = setTimeout(() => {
          isAnimating = false;
          highlightTimeout = null;
        }, 6000);
      }, 100);
    }
  });

  // Sparkle effect logic
  let sparklingGameId = $state(null);
  let sparkleInterval = null;
  let visibleGameIds = $state(new Set());
  let observer = null;

  // Setup IntersectionObserver
  $effect(() => {
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const gameId = (entry.target as HTMLElement).dataset.gameId;
            if (gameId) {
              if (entry.isIntersecting) {
                visibleGameIds.add(gameId);
              } else {
                visibleGameIds.delete(gameId);
              }
            }
          });
          // Force reactivity update for Set
          visibleGameIds = new Set(visibleGameIds);
        },
        {
          root: null,
          rootMargin: "0px",
          threshold: 0.1,
        }
      );
    }

    return () => {
      if (observer) observer.disconnect();
    };
  });

  // Observe elements when list changes
  $effect(() => {
    // Dependency on filtered list
    filteredAndSortedGames;

    tick().then(() => {
      if (observer) {
        observer.disconnect();
        visibleGameIds = new Set();

        const elements = document.querySelectorAll("[data-game-id]");
        elements.forEach((el) => observer.observe(el));
      }
    });
  });

  $effect(() => {
    // Clear any existing interval
    if (sparkleInterval) clearInterval(sparkleInterval);

    let lastSparkledGameId = null;

    // Only run if we have games
    if (filteredAndSortedGames.length > 0) {
      sparkleInterval = setInterval(
        () => {
          // Find all visible gems using the intersection observer set
          const visibleGems = filteredAndSortedGames.filter(
            (g) => g.gem && visibleGameIds.has(g.id)
          );

          if (visibleGems.length > 0) {
            // Filter out the last sparkled game to avoid repetition
            const candidates = visibleGems.filter(
              (g) => g.id !== lastSparkledGameId
            );

            if (candidates.length === 0) {
              // If the only visible gem is the one that just sparkled:
              // 1. Sparkle nothing this time
              // 2. Reset lastSparkledGameId so it can sparkle again next time
              lastSparkledGameId = null;
            } else {
              // Pick a random gem from candidates
              const randomGem =
                candidates[Math.floor(Math.random() * candidates.length)];
              sparklingGameId = randomGem.id;
              lastSparkledGameId = randomGem.id;

              // Clear sparkle after animation duration (2s)
              setTimeout(() => {
                if (sparklingGameId === randomGem.id) {
                  sparklingGameId = null;
                }
              }, 2000);
            }
          }
        },
        5000 + Math.random() * 3000
      ); // Random interval between 5-8 seconds
    }

    return () => {
      if (sparkleInterval) clearInterval(sparkleInterval);
    };
  });
</script>

<div
  class="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900"
>
  <!-- Header -->
  <header
    class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-50"
  >
    <div class="max-w-7xl mx-auto px-4 py-4">
      <!-- Header row -->
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <!-- Back button and title -->
        <div class="flex items-center gap-4">
          <button
            onclick={() => {
              navigate("/");
            }}
            class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition shrink-0"
            title="Home"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>
          <div class="flex items-center gap-5">
            {#if initialFavourites}
              <span class="text-3xl">❤️</span>
            {:else if initialGems}
              <span class="text-3xl">💎</span>
            {:else if initialGenre}
              <div class="w-8 h-8 flex items-center justify-center ml-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="w-8 h-8"
                  style="color: {getGenreColor(initialGenre)}"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.186 3.548.428a18.849 18.849 0 005.441-5.44c.758-1.16.492-2.629-.428-3.548l-9.58-9.581a3 3 0 00-2.122-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            {:else if platform === "All"}
              <img
                src="/logo.png"
                alt="All Games"
                class="h-8 w-8 object-contain ml-1"
              />
            {:else}
              <img
                src={platformInfo?.logo}
                alt={platform}
                class="h-8 object-contain"
                onerror={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            {/if}
            <div>
              <h1 class="retro-font text-base lg:text-xl text-white">
                {pageTitle}
                <span class="text-gray-400 font-normal">({gameCount})</span>
              </h1>
              <p class="text-gray-400 text-xs">
                {#if pageSubtitle}{pageSubtitle}{/if}
                {#if matchingFavorites > 0}{#if pageSubtitle}
                    •
                  {/if}{matchingFavorites} favourited{/if}
              </p>
            </div>
          </div>
        </div>

        <!-- Random + Search -->
        <div
          class="flex items-center gap-2 max-w-md mx-auto md:ml-auto md:mr-0"
        >
          {#if filteredAndSortedGames.length > 1}
            <button
              onclick={() => {
                randomBtnSvg?.classList.add("spin-once");
                pickRandomGame();
              }}
              class="vt-random-btn has-tooltip flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 transition shrink-0"
              data-tooltip="Pick a random game"
            >
              <svg
                bind:this={randomBtnSvg}
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                onanimationend={(e) =>
                  e.currentTarget.classList.remove("spin-once")}
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          {/if}
          <div class="md:w-48 lg:w-64 xl:w-80">
            <input
              bind:this={searchInput}
              value={search}
              oninput={(e) => {
                const val = e.currentTarget.value;
                const basePath = window.location.hash.split("?")[0].slice(1); // remove # and query
                const params = new URLSearchParams(
                  window.location.hash.split("?")[1] || ""
                );

                // Clear highlight when searching
                params.delete("highlight");

                if (val) {
                  params.set("search", val);
                } else {
                  params.delete("search");
                }

                const newHash = params.toString()
                  ? `${basePath}?${params.toString()}`
                  : basePath;

                // Update navigation without view transition for typing
                navigate(newHash);
              }}
              type="search"
              placeholder="Search games..."
              class="vt-search-box w-full px-4 py-2 rounded-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Game Grid -->
  <main class="max-w-7xl mx-auto px-4 py-6 flex-grow">
    <div
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      {#each filteredAndSortedGames as game, index (game.id)}
        <div
          data-game-id={game.id}
          style="order: {favoritesSet.has(game.id) ? 0 : 1}{highlightedGameId
            ? `; animation: ${highlightedGameId === game.id ? 'randomPick 4s' : 'fadeOut 6s'} ease-out`
            : ''}; max-width: 250px"
          class={highlightedGameId === game.id ? "random-highlight-base" : ""}
        >
          <GameCard
            {game}
            isFavorite={favoritesSet.has(game.id)}
            onToggleFavorite={toggleFavorite}
            isHighlighted={highlightedGameId === game.id}
            highlightAnimation={highlightedGameId === game.id && isAnimating}
            lazyImage={index >= 18}
            searchQuery={search}
            isSparkling={sparklingGameId === game.id}
          />
        </div>
      {/each}
      {#if otherMatchesCount > 0 && filteredAndSortedGames.length > 0}
        <button
          onclick={() =>
            navigate(`/platform/All?search=${encodeURIComponent(search)}`)}
          class="bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-700 transition flex flex-col items-center justify-center text-center p-4 cursor-pointer"
          style="order: 2; max-width: 250px"
        >
          <div class="relative h-28 w-32 mb-2">
            {#each otherCategoryMatches.slice(0, 3) as game, i}
              {@const filename =
                game.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".png"}
              <img
                src="/boxart/{game.platform}/{filename}"
                alt=""
                class="absolute w-20 h-24 object-cover rounded shadow-lg border border-gray-600"
                style="left: {i * 20}px; top: {i * 4}px; transform: rotate({(i -
                  1) *
                  8}deg); z-index: {3 - i}"
              />
            {/each}
          </div>
          <span class="text-white font-medium text-sm"
            >{otherMatchesCount}
            {otherMatchesCount === 1 ? "match" : "matches"} outside {categoryName}</span
          >
        </button>
      {/if}
    </div>

    {#if filteredAndSortedGames.length === 0}
      <div class="text-center py-16">
        <img
          src="/logo.png"
          alt=""
          class="w-24 h-24 mx-auto mb-4 opacity-50"
          style="filter: grayscale(1);"
        />
        <p class="text-gray-400 text-lg retro-font">
          No matching {categoryName || ""} games
        </p>
        {#if search}
          <button
            onclick={() =>
              navigate(window.location.hash.split("?")[0].slice(1))}
            class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Clear Search
          </button>
        {/if}
      </div>

      {#if otherMatches.length > 0}
        <div class="mt-8 pt-8 border-t border-gray-700">
          <p class="text-gray-400 text-center mb-6 retro-font">
            Other matches ({otherMatches.length})
          </p>
          <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {#each otherMatches as game (game.id)}
              <div style="max-width: 250px">
                <GameCard
                  {game}
                  isFavorite={favoritesSet.has(game.id)}
                  onToggleFavorite={toggleFavorite}
                  lazyImage={false}
                  searchQuery={search}
                  isSparkling={sparklingGameId === game.id}
                />
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </main>

  <!-- Footer -->
  <footer class="py-6">
    <div class="max-w-7xl mx-auto px-4">
      <!-- Toggle -->
      <div class="flex justify-center mb-4">
        <ViewToggle bind:mode={footerMode} />
      </div>

      {#if footerMode === "genres"}
        <div class="flex flex-wrap justify-center gap-x-10 gap-y-4">
          {#each allGenres as genre}
            {@const genreCount = allGames.filter((g) =>
              g.genres.includes(genre)
            ).length}
            <button
              class="retro-font text-xs transition hover:scale-105 cursor-pointer {genre ===
              initialGenre
                ? 'text-purple-400'
                : 'text-gray-300 opacity-60 hover:opacity-100'}"
              onclick={() => navigate(`/genre/${encodeURIComponent(genre)}`)}
            >
              {genre} <span class="text-gray-500 text-xs">({genreCount})</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
          {#each Object.entries(platformConfig) as [plat, config]}
            <button
              class="p-2 rounded-lg transition hover:scale-105 cursor-pointer {plat ===
              platform
                ? ''
                : 'opacity-60 hover:opacity-100'}"
              onclick={() => navigate(`/platform/${encodeURIComponent(plat)}`)}
              title={plat}
            >
              <img
                src={config.logo}
                alt={plat}
                class="h-8 object-contain transition"
                style={plat === platform
                  ? "filter: brightness(0) saturate(100%) invert(67%) sepia(51%) saturate(654%) hue-rotate(213deg) brightness(101%) contrast(94%)"
                  : ""}
                onerror={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </footer>
</div>
