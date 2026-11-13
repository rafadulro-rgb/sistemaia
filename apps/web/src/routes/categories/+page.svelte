<script>
  import { onMount } from 'svelte';
  import { api } from '$lib/stores';

  let categories = $state([]);
  let loading = $state(true);
  let error = $state('');
  let form = $state({ name: '', type: 'expense', color: '#6366f1' });
  let editing = $state(null);

  async function load() {
    loading = true;
    try { categories = await api('/categories'); }
    catch (e) { error = e.message; }
    finally { loading = false; }
  }
  onMount(load);

  function reset() { editing = null; form = { name: '', type: 'expense', color: '#6366f1' }; }
  function edit(c) { editing = c; form = { name: c.name, type: c.type, color: c.color }; }

  async function submit(e) {
    e.preventDefault();
    error = '';
    try {
      if (editing) await api(`/categories/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await api('/categories', { method: 'POST', body: JSON.stringify(form) });
      reset();
      await load();
    } catch (err) { error = err.message; }
  }

  async function remove(c) {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    try { await api(`/categories/${c.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { error = err.message; }
  }
</script>

<h1>Categorías</h1>
{#if error}<div class="error">{error}</div>{/if}

<div class="row">
  <div class="card" style="flex:1;min-width:280px;">
    <h2 style="margin-top:0;">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
    <form onsubmit={submit}>
      <div class="field"><label>Nombre <input bind:value={form.name} required /></label></div>
      <div class="field"><label>Tipo
        <select bind:value={form.type}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
        </select>
      </label></div>
      <div class="field"><label>Color <input type="color" bind:value={form.color} style="height:42px;padding:0.2rem;" /></label></div>
      <button type="submit">{editing ? 'Guardar' : 'Crear'}</button>
      {#if editing}<button type="button" class="secondary" style="margin-left:0.5rem;" onclick={reset}>Cancelar</button>{/if}
    </form>
  </div>

  <div class="card" style="flex:2;min-width:320px;">
    <h2 style="margin-top:0;">Mis categorías</h2>
    {#if loading}
      <p class="muted">Cargando…</p>
    {:else}
      {#each ['expense', 'income'] as t}
        <h3 class="muted">{t === 'expense' ? 'Gastos' : 'Ingresos'}</h3>
        {#each categories.filter((c) => c.type === t) as c}
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid var(--border);">
            <span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:{c.color};margin-right:0.5rem;"></span>{c.name}</span>
            <span>
              <button class="secondary" style="padding:0.25rem 0.55rem;" onclick={() => edit(c)}>Editar</button>
              <button class="danger" style="padding:0.25rem 0.55rem;margin-left:0.4rem;" onclick={() => remove(c)}>Eliminar</button>
            </span>
          </div>
        {/each}
      {/each}
    {/if}
  </div>
</div>
