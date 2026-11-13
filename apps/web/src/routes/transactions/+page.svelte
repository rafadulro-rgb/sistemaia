<script>
  import { onMount } from 'svelte';
  import { api, formatCurrency } from '$lib/stores';

  let transactions = $state([]);
  let accounts = $state([]);
  let categories = $state([]);
  let loading = $state(true);
  let error = $state('');
  let success = $state('');
  let editing = $state(null);

  // Filtros
  let fType = $state('');
  let fAccount = $state('');
  let fCategory = $state('');
  let fFrom = $state('');
  let fTo = $state('');
  let fQ = $state('');

  // Formulario
  let form = $state({ account_id: '', category_id: '', type: 'expense', amount: '', description: '', date: '' });

  const fmt = formatCurrency;
  const today = () => new Date().toISOString().slice(0, 10);

  async function load() {
    loading = true;
    error = '';
    try {
      const params = new URLSearchParams();
      if (fType) params.set('type', fType);
      if (fAccount) params.set('account_id', fAccount);
      if (fCategory) params.set('category_id', fCategory);
      if (fFrom) params.set('from', fFrom);
      if (fTo) params.set('to', fTo);
      if (fQ) params.set('q', fQ);
      const qs = params.toString();
      [transactions, accounts, categories] = await Promise.all([
        api(`/transactions${qs ? '?' + qs : ''}`),
        api('/accounts'),
        api('/categories'),
      ]);
      if (!form.account_id && accounts[0]) form.account_id = accounts[0].id;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    form.date = today();
    load();
  });

  const catsForType = $derived(categories.filter((c) => c.type === form.type));

  $effect(() => {
    // Al cambiar el tipo, seleccionar la primera categoría válida
    if (catsForType.length && !catsForType.some((c) => c.id === form.category_id)) {
      form.category_id = catsForType[0].id;
    }
  });

  function resetForm() {
    editing = null;
    form = { account_id: accounts[0]?.id || '', category_id: '', type: 'expense', amount: '', description: '', date: today() };
  }

  function edit(t) {
    editing = t;
    form = {
      account_id: t.account_id,
      category_id: t.category_id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: t.date,
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e) {
    e.preventDefault();
    error = '';
    success = '';
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) {
        await api(`/transactions/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        success = 'Transacción actualizada';
      } else {
        await api('/transactions', { method: 'POST', body: JSON.stringify(payload) });
        success = 'Transacción registrada';
      }
      resetForm();
      await load();
    } catch (err) {
      error = err.message;
    }
  }

  async function remove(t) {
    if (!confirm(`¿Eliminar "${t.description || 'transacción'}"?`)) return;
    try {
      await api(`/transactions/${t.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      error = err.message;
    }
  }
</script>

<h1>Transacciones</h1>
{#if error}<div class="error">{error}</div>{/if}
{#if success}<div class="success">{success}</div>{/if}

<div class="card" style="margin-bottom:1.5rem;">
  <h2 style="margin-top:0;">{editing ? 'Editar transacción' : 'Nueva transacción'}</h2>
  <form onsubmit={submit}>
    <div class="row">
      <div class="field">
        <label for="ttype">Tipo</label>
        <select id="ttype" bind:value={form.type}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
      </div>
      <div class="field">
        <label for="tamount">Monto</label>
        <input id="tamount" type="number" step="0.01" min="0" bind:value={form.amount} required />
      </div>
      <div class="field">
        <label for="tdate">Fecha</label>
        <input id="tdate" type="date" bind:value={form.date} required />
      </div>
    </div>
    <div class="row">
      <div class="field">
        <label for="taccount">Cuenta</label>
        <select id="taccount" bind:value={form.account_id} required>
          {#each accounts as a}<option value={a.id}>{a.name} ({a.type})</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="tcat">Categoría</label>
        <select id="tcat" bind:value={form.category_id} required>
          {#each catsForType as c}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="tdesc">Descripción</label>
        <input id="tdesc" type="text" bind:value={form.description} placeholder="Opcional" />
      </div>
    </div>
    <button type="submit">{editing ? 'Guardar cambios' : 'Registrar'}</button>
    {#if editing}<button type="button" class="secondary" style="margin-left:0.5rem;" onclick={resetForm}>Cancelar</button>{/if}
  </form>
</div>

<div class="card">
  <h2 style="margin-top:0;">Listado</h2>
  <div class="row" style="margin-bottom:1rem;">
    <div class="field"><label>Tipo
      <select bind:value={fType} onchange={load}>
        <option value="">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option>
      </select>
    </label></div>
    <div class="field"><label>Cuenta
      <select bind:value={fAccount} onchange={load}>
        <option value="">Todas</option>
        {#each accounts as a}<option value={a.id}>{a.name}</option>{/each}
      </select>
    </label></div>
    <div class="field"><label>Categoría
      <select bind:value={fCategory} onchange={load}>
        <option value="">Todas</option>
        {#each categories as c}<option value={c.id}>{c.name}</option>{/each}
      </select>
    </label></div>
    <div class="field"><label>Desde <input type="date" bind:value={fFrom} onchange={load} /></label></div>
    <div class="field"><label>Hasta <input type="date" bind:value={fTo} onchange={load} /></label></div>
    <div class="field"><label>Buscar <input type="text" bind:value={fQ} onkeydown={(e) => e.key === 'Enter' && load()} placeholder="Descripción…" /></label></div>
  </div>

  {#if loading}
    <p class="muted">Cargando…</p>
  {:else if transactions.length === 0}
    <p class="muted">Sin resultados.</p>
  {:else}
    <table class="table">
      <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Cuenta</th><th>Tipo</th><th>Monto</th><th></th></tr></thead>
      <tbody>
        {#each transactions as t}
          <tr>
            <td>{t.date}</td>
            <td>{t.description || '—'}</td>
            <td><span class="badge" style="background:{t.categories?.color || '#64748b'}22;color:{t.categories?.color || '#94a3b8'}">{t.categories?.name || '—'}</span></td>
            <td>{t.accounts?.name || '—'}</td>
            <td><span class="badge {t.type}">{t.type === 'income' ? 'Ingreso' : 'Gasto'}</span></td>
            <td class={t.type === 'income' ? 'amount-pos' : 'amount-neg'}>{t.type === 'income' ? '+' : '−'}{fmt(t.amount)}</td>
            <td style="white-space:nowrap;">
              <button class="secondary" style="padding:0.3rem 0.6rem;" onclick={() => edit(t)}>Editar</button>
              <button class="danger" style="padding:0.3rem 0.6rem;margin-left:0.4rem;" onclick={() => remove(t)}>Eliminar</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
