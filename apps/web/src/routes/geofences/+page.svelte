<script>
  import GeofenceMap from '$lib/components/GeofenceMap.svelte';
  import { onMount } from 'svelte';
  import { geofencesApi } from '$lib/api';

  let mapComponent;
  let geofencesData = [];
  let savedGeofences = [];
  let loading = true;
  let error = null;
  let showSaveDialog = false;
  let newGeofenceName = '';
  let locating = false;

  onMount(async () => {
    await loadGeofences();
  });

  async function loadGeofences() {
    try {
      loading = true;
      error = null;
      savedGeofences = await geofencesApi.list();
      
      // Cargar geocercas guardadas en el mapa
      if (mapComponent && savedGeofences.length > 0) {
        savedGeofences.forEach(geofence => {
          mapComponent.addGeofence(geofence.geojson);
        });
      }
    } catch (err) {
      error = err.message;
      console.error('Error cargando geocercas:', err);
    } finally {
      loading = false;
    }
  }

  function handleGeofenceCreated(event) {
    console.log('Geocerca creada:', event);
    showSaveDialog = true;
    newGeofenceName = '';
  }

  async function saveGeofence() {
    if (!newGeofenceName.trim()) {
      alert('Por favor ingresa un nombre para la geocerca');
      return;
    }

    try {
      const geojson = mapComponent.getGeofences();
      const lastFeature = geojson.features[geojson.features.length - 1];
      
      const type = lastFeature.geometry.type.toLowerCase();
      const validTypes = ['polygon', 'circle', 'rectangle', 'polyline'];
      const finalType = validTypes.includes(type) ? type : 'polygon';

      await geofencesApi.create({
        name: newGeofenceName,
        geojson: lastFeature,
        type: finalType
      });

      showSaveDialog = false;
      await loadGeofences();
      alert('Geocerca guardada exitosamente');
    } catch (err) {
      alert('Error guardando geocerca: ' + err.message);
    }
  }

  function handleGeofenceEdited(event) {
    console.log('Geocerca editada:', event);
  }

  function handleGeofenceDeleted(event) {
    console.log('Geocerca eliminada:', event);
  }

  async function locateMe() {
    if (!mapComponent) return;
    locating = true;
    try {
      await mapComponent.locateUser();
    } finally {
      locating = false;
    }
  }

  function clearAll() {
    if (mapComponent) {
      mapComponent.clearGeofences();
      geofencesData = [];
    }
  }

  function exportGeofences() {
    if (mapComponent) {
      const geojson = mapComponent.getGeofences();
      console.log('GeoJSON exportado:', geojson);
      alert('GeoJSON exportado a la consola');
    }
  }

  async function deleteGeofence(id) {
    if (!confirm('¿Estás seguro de eliminar esta geocerca?')) return;
    
    try {
      await geofencesApi.delete(id);
      await loadGeofences();
      alert('Geocerca eliminada exitosamente');
    } catch (err) {
      alert('Error eliminando geocerca: ' + err.message);
    }
  }
</script>

<div class="geofence-page">
  <h1>Gestor de Geocercas</h1>
  <p>Utiliza las herramientas de dibujo en el mapa para crear geocercas.</p>

  <div class="nav-links">
    <a href="/geofences/tracking" class="nav-link">Rastreo en Vivo</a>
    <a href="/geofences/events" class="nav-link">Historial de Eventos</a>
  </div>

  {#if error}
    <div class="error">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="loading">Cargando geocercas...</div>
  {/if}

  <div class="controls">
    <button on:click={locateMe} disabled={locating} class="locate-btn">
      {locating ? 'Obteniendo ubicación...' : '📍 Mi Ubicación'}
    </button>
    <button on:click={clearAll}>Limpiar Todas</button>
    <button on:click={exportGeofences}>Exportar GeoJSON</button>
    <button on:click={loadGeofences}>Recargar</button>
  </div>

  <GeofenceMap
    bind:this={mapComponent}
    height="600px"
    initialCenter={[19.4326, -99.1332]}
    initialZoom={13}
    allowDraw={true}
    allowEdit={true}
    allowDelete={true}
    on:geofenceCreated={handleGeofenceCreated}
    on:geofenceEdited={handleGeofenceEdited}
    on:geofenceDeleted={handleGeofenceDeleted}
  />

  {#if savedGeofences.length > 0}
    <div class="geofences-list">
      <h2>Geocercas Guardadas ({savedGeofences.length})</h2>
      <ul>
        {#each savedGeofences as geofence}
          <li class="geofence-item">
            <div class="geofence-info">
              <strong>{geofence.name}</strong>
              <span class="geofence-type">{geofence.type}</span>
              <span class="geofence-status {geofence.is_active ? 'active' : 'inactive'}">
                {geofence.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <button class="delete-btn" on:click={() => deleteGeofence(geofence.id)}>Eliminar</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

{#if showSaveDialog}
  <div class="modal-overlay" on:click={() => showSaveDialog = false}>
    <div class="modal" on:click|stopPropagation>
      <h2>Guardar Geocerca</h2>
      <p>Ingresa un nombre para la geocerca:</p>
      <input
        type="text"
        bind:value={newGeofenceName}
        placeholder="Ej: Oficina, Casa, Gimnasio"
        on:keydown={(e) => e.key === 'Enter' && saveGeofence()}
      />
      <div class="modal-actions">
        <button class="cancel-btn" on:click={() => showSaveDialog = false}>Cancelar</button>
        <button class="save-btn" on:click={saveGeofence}>Guardar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .geofence-page {
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

  .nav-links {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
  }

  .nav-link {
    padding: 10px 20px;
    background-color: #6c757d;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .nav-link:hover {
    background-color: #5a6268;
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

  .controls {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
  }

  .controls button {
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .controls button:hover {
    background-color: #0056b3;
  }

  .controls button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .controls .locate-btn {
    background-color: #17a2b8;
  }

  .controls .locate-btn:hover {
    background-color: #138496;
  }

  .geofences-list {
    margin-top: 30px;
    padding: 20px;
    background-color: #f8f9fa;
    border-radius: 4px;
  }

  .geofences-list h2 {
    margin-top: 0;
  }

  .geofences-list ul {
    list-style: none;
    padding: 0;
  }

  .geofence-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background-color: white;
    border-radius: 4px;
    margin-bottom: 8px;
    border: 1px solid #dee2e6;
  }

  .geofence-info {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .geofence-type {
    padding: 4px 8px;
    background-color: #e9ecef;
    border-radius: 3px;
    font-size: 12px;
    text-transform: uppercase;
  }

  .geofence-status {
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
  }

  .geofence-status.active {
    background-color: #d4edda;
    color: #155724;
  }

  .geofence-status.inactive {
    background-color: #f8d7da;
    color: #721c24;
  }

  .delete-btn {
    padding: 6px 12px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .delete-btn:hover {
    background-color: #c82333;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background-color: white;
    padding: 30px;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
  }

  .modal h2 {
    margin-top: 0;
    margin-bottom: 15px;
  }

  .modal p {
    margin-bottom: 15px;
  }

  .modal input {
    width: 100%;
    padding: 10px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 14px;
    margin-bottom: 20px;
    box-sizing: border-box;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .modal-actions button {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .cancel-btn {
    background-color: #6c757d;
    color: white;
  }

  .cancel-btn:hover {
    background-color: #5a6268;
  }

  .save-btn {
    background-color: #28a745;
    color: white;
  }

  .save-btn:hover {
    background-color: #218838;
  }
</style>
