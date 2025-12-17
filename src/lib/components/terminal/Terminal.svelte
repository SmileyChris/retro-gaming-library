<script>
  import { onMount } from "svelte";
  import { scale } from "svelte/transition";
  import { dungeon, toggleTerminal } from "../../dungeon/store.svelte.js";
  import Output from "./Output.svelte";
  import "./CRT.css";

  let inputEl = $state();
  let inputValue = $state("");
  let engineModule = $state(null);

  // Lazy load the engine when terminal opens for the first time
  $effect(() => {
    if (dungeon.isOpen && !dungeon.isBooted && !engineModule) {
      loadEngine();
    }
  });

  async function loadEngine() {
    const module = await import("../../dungeon/engine.js");
    engineModule = module;
    await module.initEngine();
  }

  function handleKeyDown(e) {
    // Global toggle using Tilde (~)
    if (e.key === "`" || e.key === "~") {
      e.preventDefault();
      toggleTerminal();
      return;
    }

    // Focus input if terminal is open and user starts typing
    if (dungeon.isOpen && inputEl && document.activeElement !== inputEl) {
      inputEl.focus();
    }
  }

  async function submit() {
    if (!inputValue.trim() || !engineModule) return;

    // Check for UI-level commands
    const lower = inputValue.trim().toLowerCase();
    if (["exit", "quit"].includes(lower)) {
      toggleTerminal();
      inputValue = "";
      return;
    }

    const cmd = inputValue;
    inputValue = "";
    await engineModule.handleInput(cmd);
  }

  // Attach global listener
  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Auto-focus when opening
  $effect(() => {
    if (dungeon.isOpen && inputEl) {
      // Slight delay to allow transition
      setTimeout(() => inputEl.focus(), 50);
    }
  });

  // Helper for input caret position
  function getCaretLeft(val) {
    // Simple approximation: 2.5rem padding + char width
    // For variable fonts this is hard, but we use monospace.
    return `calc(3rem + ${val.length}ch)`;
  }
</script>

{#if dungeon.isOpen}
  <div
    class="terminal-overlay"
    transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}
  >
    <!-- CRT Effects -->
    <div class="scanline"></div>
    <div class="screen-curve"></div>

    <!-- Content -->
    <div class="relative z-20 flex flex-col h-full max-w-4xl mx-auto w-full">
      <div
        class="p-4 border-b border-green-900/50 flex justify-between items-center text-green-700"
      >
        <span>RETRO REALM OS v1.0a</span>
        <div class="flex items-center gap-4">
          <span
            >MEM: {Math.max(
              0,
              65536 -
                (dungeon.visited?.size || 0) * 128 -
                (dungeon.inventory?.length || 0) * 512 -
                dungeon.history.length * 64
            )} BYTES FREE</span
          >
          <button
            onclick={toggleTerminal}
            class="hover:text-green-500 hover:bg-green-900/20 px-1 transition-colors cursor-pointer"
            >[X]</button
          >
        </div>
      </div>

      {#if !dungeon.isBooted}
        <div class="flex-1 flex items-center justify-center">
          <div class="text-green-500 font-mono text-center">
            <div class="text-xl mb-2">BOOTING...</div>
            <div class="text-green-700 text-sm">Loading dungeon modules</div>
          </div>
        </div>
      {:else}
        <Output history={dungeon.history} />

        <div class="input-line relative">
          <span class="text-green-500 font-bold mr-2">{">"}</span>
          <input
            bind:this={inputEl}
            bind:value={inputValue}
            onkeydown={(e) => e.key === "Enter" && submit()}
            onblur={() => inputEl?.focus()}
            type="text"
            class="bg-transparent border-none outline-none text-green-400 font-mono w-full caret-transparent"
            autocomplete="off"
            spellcheck="false"
          />
          <!-- Custom Caret -->
          <span
            class="input-caret absolute pointer-events-none text-green-400"
            style="left: {getCaretLeft(inputValue)}">█</span
          >
        </div>
      {/if}
    </div>
  </div>
{/if}
