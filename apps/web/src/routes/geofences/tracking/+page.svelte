<script>
  import { onMount, onDestroy } from 'svelte';
  import { geofenceDetector } from '$lib/geofenceDetector';
  import { geolocationService } from '$lib/geolocation';

  let tracking = false;
  let currentPosition = null;
  let recentEvents = [];
  let error = null;
  let loading = false;
  let unsubscribe = null;

  onMount(() => {
    // Suscribirse a eventos de geocerca
    unsubscribe = geofenceDetector.onGeofenceEvent((event) => {
      recentEvents = [event, ...recentEvents].slice(0, 10); // Mantener solo los últimos 10
    });
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    // No detener tracking automáticamente para permitir persistencia
  });

  async function toggleTracking() {
    if (tracking) {
      stopTracking();
    } else {
      await startTracking();
    }
  }

  async function startTracking() {
    try {
      loading = true;
      error = null;

      // Verificar soporte de geolocalización
      if (!geolocationService.isSupported()) {
        error = 'Tu navegador no soporta geolocalización. Por favor, usa un navegador moderno como Chrome, Firefox o Edge.';
        loading = false;
        return;
      }

      await geofenceDetector.startDetection();
      tracking = true;

      // Obtener posición inicial
      currentPosition = await geolocationService.getCurrentPosition();

      // Suscribirse a cambios de posición
      geolocationService.onPositionChange((pos) => {
        currentPosition = pos;
      });
    } catch (err) {
      error = err.message;
      console.error('Error iniciando tracking:', err);
    } finally {
      loading = false;
    }
  }

  function stopTracking() {
    geofenceDetector.stopDetection();
    tracking = false;
    currentPosition = null;
  }

  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function getEventTypeLabel(type) {
    return type === 'enter' ? 'Entró a' : 'Salió de';
  }

  function getEventTypeClass(type) {
    return type === 'enter' ? 'enter' : 'exit';
  }
</script>

<div class="tracking-page">
  <h1>Rastreo de Geocercas</h1>
  <p>Activa el rastreo para detectar automáticamente cuando entres o salgas de tus geocercas.</p>

  <div class="status-card">
    <div class="status-header">
      <h2>Estado del Rastreo</h2>
      <span class="status-badge {tracking ? 'active' : 'inactive'}">
        {tracking ? 'Activo' : 'Inactivo'}
      </span>
    </div>

    {#if error}
      <div class="error">
        {error}
      </div>
    {/if}

    <div class="controls">
      <button 
        class="toggle-btn {tracking ? 'stop' : 'start'}" 
        on:click={toggleTracking}
        disabled={loading}
      >
        {loading ? 'Iniciando...' : (tracking ? 'Detener Rastreo' : 'Iniciar Rastreo')}
      </button>
    </div>

    {#if currentPosition}
      <div class="position-info">
        <h3>Ubicación Actual</h3>
        <div class="position-details">
          <div class="position-item">
            <span class="label">Latitud:</span>
            <span class="value">{currentPosition.latitude.toFixed(6)}</span>
          </div>
          <div class="position-item">
            <span class="label">Longitud:</span>
            <span class="value">{currentPosition.longitude.toFixed(6)}</span>
          </div>
          <div class="position-item">
            <span class="label">Precisión:</span>
            <span class="value">{currentPosition.accuracy ? `${currentPosition.accuracy.toFixed(1)}m` : 'N/A'}</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if recentEvents.length > 0}
    <div class="events-card">
      <h2>Eventos Recientes</h2>
      <div class="events-list">
        {#each recentEvents as event}
          <div class="event-item">
            <span class="event-badge {getEventTypeClass(event.eventType)}">
              {getEventTypeLabel(event.eventType)}
            </span>
            <span class="event-geofence">{event.geofence.name}</span>
            <span class="event-time">{formatDate(event.timestamp)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="info-card">
    <h2>Información</h2>
    <ul>
      <li>El rastreo se ejecuta en segundo plano mientras esta página esté abierta</li>
      <li>Se verifica tu posición cada 5 segundos</li>
      <li>Los eventos de entrada/salida se guardan automáticamente en la base de datos</li>
      <li>Puedes ver el historial completo en la página de eventos</li>
    </ul>
  </div>
</div>

<style>
  .tracking-page {
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

  .status-card {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .status-header h2 {
    margin: 0;
  }

  .status-badge {
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.active {
    background-color: #d4edda;
    color: #155724;
  }

  .status-badge.inactive {
    background-color: #f8d7da;
    color: #721c24;
  }

  .error {
    padding: 12px;
    background-color: #f8d7da;
    color: #721c24;
    border-radius: 4px;
    margin-bottom: 15px;
  }

  .controls {
    margin-bottom: 20px;
  }

  .toggle-btn {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: background-color 0.2s;
  }

  .toggle-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .toggle-btn.start {
    background-color: #28a745;
    color: white;
  }

  .toggle-btn.start:hover:not(:disabled) {
    background-color: #218838;
  }

  .toggle-btn.stop {
    background-color: #dc3545;
    color: white;
  }

  .toggle-btn.stop:hover:not(:disabled) {
    background-color: #c82333;
  }

  .position-info {
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 4px;
  }

  .position-info h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }

  .position-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .position-item {
    display: flex;
    gap: 10px;
  }

  .position-item .label {
    font-weight: 500;
    color: #6c757d;
  }

  .position-item .value {
    font-family: monospace;
  }

  .events-card {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .events-card h2 {
    margin-top: 0;
    margin-bottom: 15px;
  }

  .events-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .event-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
  }

  .event-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
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

  .event-geofence {
    flex: 1;
    font-weight: 500;
  }

  .event-time {
    color: #6c757d;
    font-size: 12px;
  }

  .info-card {
    background-color: #e7f3ff;
    border-radius: 8px;
    padding: 20px;
    border-left: 4px solid #007bff;
  }

  .info-card h2 {
    margin-top: 0;
    margin-bottom: 10px;
  }

  .info-card ul {
    margin: 0;
    padding-left: 20px;
  }

  .info-card li {
    margin-bottom: 8px;
    color: #495057;
  }
</style>
