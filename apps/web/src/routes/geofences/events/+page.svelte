<script>
  import { onMount } from 'svelte';
  import { geofencesApi } from '$lib/api';

  let events = [];
  let loading = true;
  let error = null;
  let filterType = 'all'; // all, enter, exit

  onMount(async () => {
    await loadEvents();
  });

  async function loadEvents() {
    try {
      loading = true;
      error = null;
      
      const params = {};
      if (filterType !== 'all') {
        params.event_type = filterType;
      }
      
      events = await geofencesApi.getAllEvents(params);
    } catch (err) {
      error = err.message;
      console.error('Error cargando eventos:', err);
    } finally {
      loading = false;
    }
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function getEventTypeLabel(type) {
    return type === 'enter' ? 'Entrada' : 'Salida';
  }

  function getEventTypeClass(type) {
    return type === 'enter' ? 'enter' : 'exit';
  }
</script>

<div class="events-page">
  <h1>Historial de Eventos de Geocercas</h1>
  <p>Registro de entradas y salidas de geocercas.</p>

  <div class="filters">
    <label for="filterType">Filtrar por tipo:</label>
    <select id="filterType" bind:value={filterType} on:change={loadEvents}>
      <option value="all">Todos</option>
      <option value="enter">Entradas</option>
      <option value="exit">Salidas</option>
    </select>
    <button on:click={loadEvents}>Recargar</button>
  </div>

  {#if error}
    <div class="error">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="loading">Cargando eventos...</div>
  {:else if events.length === 0}
    <div class="empty">
      No hay eventos registrados. Activa el rastreo de geocercas para comenzar a registrar eventos.
    </div>
  {:else}
    <div class="events-list">
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Geocerca</th>
            <th>Ubicación</th>
            <th>Precisión</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {#each events as event}
            <tr>
              <td>
                <span class="event-badge {getEventTypeClass(event.event_type)}">
                  {getEventTypeLabel(event.event_type)}
                </span>
              </td>
              <td>{event.geofence_id || 'N/A'}</td>
              <td>
                {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
              </td>
              <td>{event.accuracy ? `${event.accuracy.toFixed(1)}m` : 'N/A'}</td>
              <td>{formatDate(event.occurred_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .events-page {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    margin-bottom: 10px;
  }

  p {
    margin-bottom: 20px;
    color: #666;
  }

  .filters {
    display: flex;
    gap: 15px;
    align-items: center;
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 4px;
  }

  .filters label {
    font-weight: 500;
  }

  .filters select {
    padding: 8px 12px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 14px;
  }

  .filters button {
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .filters button:hover {
    background-color: #0056b3;
  }

  .error {
    padding: 15px;
    background-color: #f8d7da;
    color: #721c24;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .loading {
    padding: 15px;
    background-color: #d1ecf1;
    color: #0c5460;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .empty {
    padding: 30px;
    background-color: #f8f9fa;
    color: #6c757d;
    text-align: center;
    border-radius: 4px;
  }

  .events-list {
    background-color: white;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background-color: #f8f9fa;
  }

  th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #dee2e6;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #dee2e6;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover {
    background-color: #f8f9fa;
  }

  .event-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .event-badge.enter {
    background-color: #d4edda;
    color: #155724;
  }

  .event-badge.exit {
    background-color: #f8d7da;
    color: #721c24;
  }
</style>
