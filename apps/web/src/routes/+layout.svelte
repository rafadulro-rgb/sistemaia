<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { auth, clearAuth, currency, setCurrency, fetchExchangeRate } from '$lib/stores';

  let { children } = $props();
  let ready = $state(false);

  const publicRoutes = ['/login', '/register'];
  const links = [
    ['/', 'Dashboard'],
    ['/transactions', 'Transacciones'],
    ['/accounts', 'Cuentas'],
    ['/categories', 'Categorías'],
    ['/reports', 'Reportes'],
    ['/data', 'Datos'],
    ['/mapa', 'Mapa'],
    ['/geofences', 'Geocercas'],
  ];

  onMount(() => {
    const unsub = auth.subscribe(({ token }) => {
      const path = $page.url.pathname;
      const isPublic = publicRoutes.includes(path);
      if (!token && !isPublic) {
        location.href = '/login';
        return;
      }
      if (token && isPublic) {
        location.href = '/';
        return;
      }
      ready = true;
    });
    fetchExchangeRate();
    return unsub;
  });

  function toggleCurrency() {
    const newCurrency = $currency.selected === 'USD' ? 'MXN' : 'USD';
    setCurrency(newCurrency);
  }
</script>

{#if ready}
  {#if $auth.token}
    <nav style="display:flex;gap:1rem;align-items:center;padding:0.75rem 1.5rem;background:var(--panel);border-bottom:1px solid var(--border);flex-wrap:wrap;">
      <strong style="color:var(--accent);margin-right:1rem;">SistemaIA</strong>
      {#each links as [href, label]}
        <a href={href} style="color:var(--muted);" class:active={$page.url.pathname === href}>
          {label}
        </a>
      {/each}
      <span style="margin-left:auto;display:flex;gap:1rem;align-items:center;">
        <button 
          class="secondary" 
          style="padding:0.3rem 0.7rem;display:flex;align-items:center;gap:0.5rem;"
          onclick={toggleCurrency}
          disabled={$currency.loading}
        >
          <span>{$currency.selected}</span>
          {#if $currency.loading}
            <span class="muted">...</span>
          {:else if $currency.selected === 'MXN' && $currency.exchangeRate > 1}
            <span class="muted" style="font-size:0.8rem;">(${$currency.exchangeRate.toFixed(2)})</span>
          {/if}
        </button>
        <span class="muted">{$auth.user?.name}</span>
        <button class="secondary" style="padding:0.3rem 0.7rem;" onclick={clearAuth}>Salir</button>
      </span>
    </nav>
  {/if}

  <main style="max-width:1100px;margin:0 auto;padding:1.5rem;">
    {@render children()}
  </main>
{/if}

<style>
  a.active { color: var(--text) !important; font-weight: 600; }
</style>
