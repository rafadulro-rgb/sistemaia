<script>
  import { api } from '$lib/stores';

  let message = $state('');
  let error = $state('');
  let importing = $state(false);
  let fileInput;

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

  function getToken() {
    return localStorage.getItem('token');
  }

  async function downloadCSV() {
    error = '';
    const res = await fetch(`${API_URL}/api/io/export?format=csv`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) { error = 'Error al exportar CSV'; return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transacciones.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function downloadJSON() {
    error = '';
    const res = await fetch(`${API_URL}/api/io/export?format=json`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) { error = 'Error al exportar JSON'; return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'respaldo.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    error = '';
    message = '';
    importing = true;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch(`${API_URL}/api/io/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ format: 'json', data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al importar');
      message = `Importación completa: ${body.imported.accounts} cuentas, ${body.imported.categories} categorías, ${body.imported.transactions} transacciones (${body.imported.skipped} omitidas).`;
    } catch (err) {
      error = err.message;
    } finally {
      importing = false;
      e.target.value = '';
    }
  }
</script>

<h1>Exportar / Importar</h1>
{#if error}<div class="error">{error}</div>{/if}
{#if message}<div class="success">{message}</div>{/if}

<div class="row">
  <div class="card" style="flex:1;min-width:300px;">
    <h2 style="margin-top:0;">Exportar</h2>
    <p class="muted">Descarga todos tus datos (cuentas, categorías y transacciones).</p>
    <div class="field">
      <button onclick={downloadJSON} style="margin-right:0.5rem;">Respaldo JSON</button>
      <button class="secondary" onclick={downloadCSV}>Transacciones CSV</button>
    </div>
    <p class="muted" style="font-size:0.85rem;">El CSV solo incluye transacciones y es compatible con Excel.</p>
  </div>

  <div class="card" style="flex:1;min-width:300px;">
    <h2 style="margin-top:0;">Importar</h2>
    <p class="muted">Restaura un respaldo JSON generado por este sistema. Los registros se duplican si ya existen.</p>
    <div class="field">
      <input type="file" accept=".json,application/json" bind:this={fileInput} onchange={importJSON} disabled={importing} />
    </div>
    {#if importing}<p class="muted">Importando…</p>{/if}
  </div>
</div>
