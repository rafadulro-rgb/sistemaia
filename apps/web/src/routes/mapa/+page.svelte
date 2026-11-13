<script>
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';

  let map;
  let container;
  let userMarker;
  let bankMarkers = [];
  let userLocation = $state(null);
  let banks = $state([]);
  let loading = $state(true);
  let error = $state('');
  let searchRadius = 2000; // 2km en metros

  onMount(async () => {
    try {
      // Inicializar mapa
      map = L.map(container).setView([19.4326, -99.1332], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Obtener ubicación del usuario
      await getUserLocation();
    } catch (e) {
      error = e.message;
      loading = false;
    }
  });

  async function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada por el navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          userLocation = { lat: latitude, lng: longitude };
          
          // Centrar mapa en ubicación del usuario
          map.setView([latitude, longitude], 15);
          
          // Agregar marcador del usuario
          const userIcon = L.divIcon({
            className: 'user-marker',
            html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          userMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
          userMarker.bindPopup('<strong>Tu ubicación</strong>').openPopup();

          // Buscar bancos cercanos
          await searchNearbyBanks(latitude, longitude);
          resolve();
        },
        (err) => {
          reject(new Error('No se pudo obtener la ubicación: ' + err.message));
        },
        { enableHighAccuracy: true }
      );
    });
  }

  async function searchNearbyBanks(lat, lng) {
    try {
      // Usar Overpass API para buscar bancos
      const radius = searchRadius;
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="bank"](around:${radius},${lat},${lng});
          way["amenity"="bank"](around:${radius},${lat},${lng});
        );
        out body center;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response');
      }

      const data = await response.json();
      
      if (!data.elements) {
        throw new Error('Invalid API response format');
      }
      
      banks = data.elements.map(el => ({
        id: el.id,
        name: el.tags?.name || 'Banco sin nombre',
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        tags: el.tags
      }));

      // Agregar marcadores de bancos
      addBankMarkers();
      loading = false;
    } catch (e) {
      error = 'Error al buscar bancos: ' + e.message;
      loading = false;
    }
  }

  function addBankMarkers() {
    // Limpiar marcadores anteriores
    bankMarkers.forEach(marker => map.removeLayer(marker));
    bankMarkers = [];

    const bankIcon = L.divIcon({
      className: 'bank-marker',
      html: '<div style="background: #10b981; width: 24px; height: 24px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">$</div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    banks.forEach(bank => {
      const marker = L.marker([bank.lat, bank.lng], { icon: bankIcon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <strong>${bank.name}</strong><br>
          <small>Lat: ${bank.lat.toFixed(5)}, Lng: ${bank.lng.toFixed(5)}</small>
        </div>
      `);
      bankMarkers.push(marker);
    });

    // Ajustar vista para incluir todos los marcadores
    if (bankMarkers.length > 0) {
      const group = L.featureGroup([userMarker, ...bankMarkers]);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  async function refreshLocation() {
    loading = true;
    error = '';
    banks = [];
    try {
      await getUserLocation();
    } catch (e) {
      error = e.message;
      loading = false;
    }
  }

  async function searchWithRadius() {
    if (!userLocation) return;
    loading = true;
    banks = [];
    await searchNearbyBanks(userLocation.lat, userLocation.lng);
  }
</script>

<div class="map-page">
  <h1>Mapa de Bancos Cercanos</h1>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="controls" style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
    <button onclick={refreshLocation} disabled={loading}>
      {loading ? 'Cargando...' : '🔄 Actualizar ubicación'}
    </button>
    
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <label for="radius">Radio de búsqueda:</label>
      <select 
        id="radius" 
        bind:value={searchRadius} 
        onchange={searchWithRadius}
        disabled={loading}
      >
        <option value={1000}>1 km</option>
        <option value={2000}>2 km</option>
        <option value={5000}>5 km</option>
        <option value={10000}>10 km</option>
      </select>
    </div>

    {#if userLocation}
      <span class="muted">
        Ubicación: {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
      </span>
    {/if}
  </div>

  <div class="map-container" style="margin-bottom: 1.5rem;">
    <div bind:this={container} style="height: 500px; width: 100%; border-radius: 8px; overflow: hidden;"></div>
  </div>

  {#if banks.length > 0}
    <div class="card">
      <h2 style="margin-top: 0;">Bancos encontrados ({banks.length})</h2>
      <div class="bank-list">
        {#each banks as bank}
          <div class="bank-item">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <strong>{bank.name}</strong>
                <div class="muted" style="font-size: 0.9rem;">
                  {bank.tags?.operator ? `Operador: ${bank.tags.operator}` : ''}
                </div>
              </div>
              <button 
                class="secondary" 
                style="padding: 0.3rem 0.7rem; font-size: 0.85rem;"
                onclick={() => {
                  map.setView([bank.lat, bank.lng], 17);
                  bankMarkers.find(m => 
                    m.getLatLng().lat === bank.lat && m.getLatLng().lng === bank.lng
                  )?.openPopup();
                }}
              >
                Ver en mapa
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if !loading}
    <div class="card">
      <p class="muted">No se encontraron bancos en el área de búsqueda.</p>
    </div>
  {/if}
</div>

<style>
  .map-page {
    max-width: 1100px;
    margin: 0 auto;
  }

  .bank-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .bank-item {
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--panel);
  }

  .bank-item:hover {
    border-color: var(--accent);
  }
</style>
