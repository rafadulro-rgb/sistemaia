<script>
  import { onMount } from 'svelte';
  import { api, formatCurrency } from '$lib/stores';

  const TYPES = [
    ['bank', 'Cuenta bancaria'],
    ['credit_card', 'Tarjeta de crédito'],
    ['savings', 'Ahorro'],
    ['cash', 'Efectivo'],
    ['other', 'Otra'],
  ];

  let accounts = $state([]);
  let loading = $state(true);
  let error = $state('');
  let form = $state({ name: '', type: 'bank', balance: 0, currency: 'USD' });
  let editing = $state(null);

  const fmt = formatCurrency;
  const typeLabel = (t) => TYPES.find(([v]) => v === t)?.[1] || t;

  async function load() {
    loading = true;
    try { accounts = await api('/accounts'); }
    catch (e) { error = e.message; }
    finally { loading = false; }
  }
  onMount(load);

  function reset() { editing = null; form = { name: '', type: 'bank', balance: 0, currency: 'USD' }; }

  function edit(a) {
    editing = a;
    form = { name: a.name, type: a.type, balance: a.balance, currency: a.currency };
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    try {
      const payload = { ...form, balance: Number(form.balance) };
      if (editing) await api(`/accounts/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await api('/accounts', { method: 'POST', body: JSON.stringify(payload) });
      reset();
      await load();
    } catch (err) { error = err.message; }
  }

  async function remove(a) {
    if (!confirm(`¿Eliminar la cuenta "${a.name}"? Sus transacciones también se eliminarán.`)) return;
    try { await api(`/accounts/${a.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { error = err.message; }
  }
</script>

<h1>Cuentas</h1>
{#if error}<div class="error">{error}</div>{/if}

<div class="row">
  <div class="card" style="flex:1;min-width:300px;">
    <h2 style="margin-top:0;">{editing ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
    <form onsubmit={submit}>
      <div class="field"><label>Nombre <input bind:value={form.name} required placeholder="Ej. Banco XYZ" /></label></div>
      <div class="field"><label>Tipo
        <select bind:value={form.type}>
          {#each TYPES as [v, l]}<option value={v}>{l}</option>{/each}
        </select>
      </label></div>
      <div class="field"><label>Balance inicial <input type="number" step="0.01" bind:value={form.balance} /></label></div>
      <div class="field"><label>Moneda <input bind:value={form.currency} maxlength="3" /></label></div>
      <button type="submit">{editing ? 'Guardar' : 'Crear cuenta'}</button>
      {#if editing}<button type="button" class="secondary" style="margin-left:0.5rem;" onclick={reset}>Cancelar</button>{/if}
    </form>
  </div>

  <div class="card" style="flex:2;min-width:320px;">
    <h2 style="margin-top:0;">Mis cuentas</h2>
    {#if loading}
      <p class="muted">Cargando…</p>
    {:else if accounts.length === 0}
      <p class="muted">No hay cuentas.</p>
    {:else}
      <table class="table">
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Balance</th><th></th></tr></thead>
        <tbody>
          {#each accounts as a}
            <tr>
              <td>{a.name}</td>
              <td>{typeLabel(a.type)}</td>
              <td>{fmt(a.balance)}</td>
              <td style="white-space:nowrap;">
                <button class="secondary" style="padding:0.3rem 0.6rem;" onclick={() => edit(a)}>Editar</button>
                <button class="danger" style="padding:0.3rem 0.6rem;margin-left:0.4rem;" onclick={() => remove(a)}>Eliminar</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="muted" style="margin-bottom:0;">El balance se actualiza automáticamente al registrar o eliminar transacciones.</p>
    {/if}
  </div>
</div>
