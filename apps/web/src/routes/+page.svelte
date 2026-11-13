<script>
  import { onMount } from 'svelte';
  import { api, currency } from '$lib/stores';
  import { Pie } from 'svelte-chartjs';
  import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

  ChartJS.register(ArcElement, Tooltip, Legend);

  let summary = $state(null);
  let accounts = $state([]);
  let recent = $state([]);
  let loading = $state(true);
  let error = $state('');

  function formatCurrency(amount) {
    const { selected, exchangeRate } = $currency;
    // Backend stores amounts in USD (base currency)
    // If MXN is selected, convert USD to MXN by multiplying by exchange rate
    // If USD is selected, keep as-is
    const convertedAmount = selected === 'MXN' ? amount * exchangeRate : amount;
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: selected
    }).format(convertedAmount || 0);
  }

  function formatOppositeCurrency(amount) {
    const { selected, exchangeRate } = $currency;
    const oppositeCurrency = selected === 'MXN' ? 'USD' : 'MXN';
    // Amount is always in USD (from backend)
    // Convert to opposite currency
    const convertedAmount = oppositeCurrency === 'MXN' ? amount * exchangeRate : amount / exchangeRate;
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: oppositeCurrency
    }).format(convertedAmount || 0);
  }

  let chartData = $derived(
    summary?.totals ? {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        data: [summary.totals.income, summary.totals.expense],
        backgroundColor: ['#10b981', '#f87171'],
        borderWidth: 0
      }]
    } : null
  );

  let chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  onMount(async () => {
    try {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const [s, a, t] = await Promise.all([
        api(`/reports/summary?period=monthly&date=${date}`),
        api('/accounts'),
        api('/transactions'),
      ]);
      summary = s;
      accounts = a;
      recent = t.slice(0, 8);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<h1>Dashboard</h1>
{#if $currency.selected === 'MXN' && $currency.exchangeRate > 1}
  <div class="card" style="padding:0.5rem 1rem;margin-bottom:1rem;display:inline-block;">
    <span class="muted">Tipo de cambio:</span>
    <strong style="margin-left:0.5rem;">1 USD = ${$currency.exchangeRate.toFixed(2)} MXN</strong>
  </div>
{/if}
{#if error}<div class="error">{error}</div>{/if}
{#if loading}
  <p class="muted">Cargando…</p>
{:else}
  <div class="row" style="margin-bottom:1.5rem;">
    <div class="card">
      <p class="muted" style="margin:0;">Ingresos del mes</p>
      <p class="amount-pos" style="font-size:1.6rem;margin:0.3rem 0;">{formatCurrency(summary?.totals.income)}</p>
      {#if $currency.selected === 'MXN' && $currency.exchangeRate > 1}
        <p class="muted" style="font-size:0.85rem;margin:0;">{formatOppositeCurrency(summary?.totals.income)}</p>
      {/if}
    </div>
    <div class="card">
      <p class="muted" style="margin:0;">Gastos del mes</p>
      <p class="amount-neg" style="font-size:1.6rem;margin:0.3rem 0;">{formatCurrency(summary?.totals.expense)}</p>
      {#if $currency.selected === 'MXN' && $currency.exchangeRate > 1}
        <p class="muted" style="font-size:0.85rem;margin:0;">{formatOppositeCurrency(summary?.totals.expense)}</p>
      {/if}
    </div>
    <div class="card">
      <p class="muted" style="margin:0;">Balance del mes</p>
      <p style="font-size:1.6rem;margin:0.3rem 0;" class:amount-pos={summary?.totals.balance >= 0} class:amount-neg={summary?.totals.balance < 0}>
        {formatCurrency(summary?.totals.balance)}
      </p>
      {#if $currency.selected === 'MXN' && $currency.exchangeRate > 1}
        <p class="muted" style="font-size:0.85rem;margin:0;" class:amount-pos={summary?.totals.balance >= 0} class:amount-neg={summary?.totals.balance < 0}>
          {formatOppositeCurrency(summary?.totals.balance)}
        </p>
      {/if}
    </div>
    <div class="card">
      <p class="muted" style="margin:0;">Total en cuentas</p>
      <p style="font-size:1.6rem;margin:0.3rem 0;">{formatCurrency(accounts.reduce((s, a) => s + Number(a.balance), 0))}</p>
      {#if $currency.selected === 'MXN' && $currency.exchangeRate > 1}
        <p class="muted" style="font-size:0.85rem;margin:0;">{formatOppositeCurrency(accounts.reduce((s, a) => s + Number(a.balance), 0))}</p>
      {/if}
    </div>
  </div>

  <div class="row">
    <div class="card" style="flex:2;min-width:320px;">
      <h2 style="margin-top:0;">Transacciones recientes</h2>
      {#if recent.length === 0}
        <p class="muted">No hay transacciones todavía. <a href="/transactions">Agregar una</a></p>
      {:else}
        <table class="table">
          <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Importe</th></tr></thead>
          <tbody>
            {#each recent as t}
              <tr>
                <td>{t.date}</td>
                <td>{t.description || '—'}</td>
                <td>{t.categories?.name || '—'}</td>
                <td>{t.accounts?.name || '—'}</td>
                <td class={t.type === 'income' ? 'amount-pos' : 'amount-neg'}>
                  {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
    <div class="card">
      <h2 style="margin-top:0;">Cuentas</h2>
      {#each accounts as a}
        <div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border);">
          <span>{a.name} <span class="muted">({a.type})</span></span>
          <strong>{formatCurrency(a.balance)}</strong>
        </div>
      {/each}
      <p style="margin-bottom:0;"><a href="/accounts">Gestionar cuentas →</a></p>
    </div>
  </div>

  <div class="card" style="margin-top:1.5rem;">
    <h2 style="margin-top:0;">Distribución de Ingresos vs Gastos (Mes Actual)</h2>
    {#if chartData}
      <div style="height:300px;max-width:400px;margin:0 auto;">
        <Pie data={chartData} options={chartOptions} />
      </div>
    {:else}
      <p class="muted">No hay datos disponibles</p>
    {/if}
  </div>
{/if}
