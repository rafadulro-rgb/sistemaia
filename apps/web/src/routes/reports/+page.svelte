<script>
  import { onMount } from 'svelte';
  import { api, formatCurrency } from '$lib/stores';

  let period = $state('monthly');
  let date = $state('');
  let report = $state(null);
  let loading = $state(false);
  let error = $state('');

  const fmt = formatCurrency;

  async function load() {
    loading = true;
    error = '';
    try {
      report = await api(`/reports/summary?period=${period}&date=${date}`);
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    date = new Date().toISOString().slice(0, 10);
    load();
  });

  const maxCat = $derived(Math.max(1, ...(report?.byCategory.map((c) => c.income + c.expense) || [1])));
  const maxAcc = $derived(Math.max(1, ...(report?.byAccount.map((a) => a.income + a.expense) || [1])));
</script>

<h1>Reportes</h1>

<div class="card" style="margin-bottom:1.5rem;">
  <div class="row">
    <div class="field" style="max-width:200px;">
      <label>Periodo
        <select bind:value={period} onchange={load}>
          <option value="daily">Diario</option>
          <option value="monthly">Mensual</option>
          <option value="annual">Anual</option>
        </select>
      </label>
    </div>
    <div class="field" style="max-width:200px;">
      <label>Fecha de referencia
        <input type="date" bind:value={date} onchange={load} />
      </label>
    </div>
    <div class="field" style="align-self:end;">
      <button class="secondary" onclick={load}>Actualizar</button>
    </div>
  </div>
</div>

{#if error}<div class="error">{error}</div>{/if}
{#if loading}
  <p class="muted">Generando reporte…</p>
{:else if report}
  <div class="row" style="margin-bottom:1.5rem;">
    <div class="card"><p class="muted" style="margin:0;">Ingresos ({report.range.label})</p>
      <p class="amount-pos" style="font-size:1.5rem;margin:0.3rem 0;">{fmt(report.totals.income)}</p></div>
    <div class="card"><p class="muted" style="margin:0;">Gastos</p>
      <p class="amount-neg" style="font-size:1.5rem;margin:0.3rem 0;">{fmt(report.totals.expense)}</p></div>
    <div class="card"><p class="muted" style="margin:0;">Balance</p>
      <p style="font-size:1.5rem;margin:0.3rem 0;" class:amount-pos={report.totals.balance >= 0} class:amount-neg={report.totals.balance < 0}>
        {fmt(report.totals.balance)}</p></div>
    <div class="card"><p class="muted" style="margin:0;">Transacciones</p>
      <p style="font-size:1.5rem;margin:0.3rem 0;">{report.totals.count}</p></div>
  </div>

  <div class="row">
    <div class="card" style="flex:1;min-width:320px;">
      <h2 style="margin-top:0;">Por categoría</h2>
      {#if report.byCategory.length === 0}
        <p class="muted">Sin movimientos en el periodo.</p>
      {:else}
        {#each report.byCategory as c}
          {@const total = c.income + c.expense}
          <div style="margin-bottom:0.9rem;">
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
              <span>{c.name} <span class="muted">({c.type === 'income' ? 'ingreso' : 'gasto'})</span></span>
              <span>{fmt(total)}</span>
            </div>
            <div style="height:8px;background:var(--panel2);border-radius:4px;margin-top:0.3rem;">
              <div style="height:100%;width:{(total / maxCat) * 100}%;background:var(--accent);border-radius:4px;"></div>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="card" style="flex:1;min-width:320px;">
      <h2 style="margin-top:0;">Por cuenta</h2>
      {#if report.byAccount.length === 0}
        <p class="muted">Sin movimientos en el periodo.</p>
      {:else}
        {#each report.byAccount as a}
          {@const total = a.income + a.expense}
          <div style="margin-bottom:0.9rem;">
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
              <span>{a.name}</span>
              <span>+{fmt(a.income)} / −{fmt(a.expense)}</span>
            </div>
            <div style="height:8px;background:var(--panel2);border-radius:4px;margin-top:0.3rem;">
              <div style="height:100%;width:{(total / maxAcc) * 100}%;background:var(--green);border-radius:4px;"></div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
