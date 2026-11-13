<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import 'leaflet-draw/dist/leaflet.draw.css';
  import 'leaflet-draw';
  import { geolocationService } from '$lib/geolocation';

  export let initialCenter = [19.4326, -99.1332]; // Ciudad de México por defecto
  export let initialZoom = 13;
  export let height = '500px';
  export let width = '100%';
  export let allowDraw = true;
  export let allowEdit = true;
  export let allowDelete = true;

  const dispatch = createEventDispatcher();

  let map;
  let drawnItems;
  let container;
  let userMarker;
  let accuracyCircle;
  let locating = false;
  let locationMessage = '';

  export { addGeofence, clearGeofences, getGeofences, setView, fitBounds, locateUser };

  onMount(() => {
    map = L.map(container).setView(initialCenter, initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    if (allowDraw || allowEdit || allowDelete) {
      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
          remove: allowDelete
        },
        draw: {
          polygon: allowDraw,
          polyline: allowDraw,
          rectangle: allowDraw,
          circle: allowDraw,
          marker: allowDraw,
          circlemarker: false
        }
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (event) => {
        const layer = event.layer;
        drawnItems.addLayer(layer);
        dispatch('geofenceCreated', { layer, type: event.layerType });
      });

      map.on(L.Draw.Event.EDITED, (event) => {
        const layers = event.layers;
        dispatch('geofenceEdited', { layers });
      });

      map.on(L.Draw.Event.DELETED, (event) => {
        const layers = event.layers;
        dispatch('geofenceDeleted', { layers });
      });
    }
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function addGeofence(geojson) {
    const layer = L.geoJSON(geojson);
    drawnItems.addLayer(layer);
    return layer;
  }

  function clearGeofences() {
    drawnItems.clearLayers();
  }

  function getGeofences() {
    return drawnItems.toGeoJSON();
  }

  function setView(center, zoom) {
    map.setView(center, zoom);
  }

  function fitBounds(bounds) {
    map.fitBounds(bounds);
  }

  async function locateUser() {
    if (!geolocationService.isSupported()) {
      locationMessage = 'Tu navegador no soporta geolocalización.';
      return;
    }

    locating = true;
    locationMessage = '';
    try {
      const pos = await geolocationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
      const latlng = [pos.latitude, pos.longitude];

      map.flyTo(latlng, 17, { duration: 1 });

      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const isNew = !userMarker;
      if (userMarker) {
        userMarker.setLatLng(latlng);
        userMarker.setIcon(userIcon);
      } else {
        userMarker = L.marker(latlng, { icon: userIcon }).addTo(map);
        userMarker.bindPopup(
          `<strong>Tu ubicación</strong><br/>` +
          `Lat: ${pos.latitude.toFixed(6)}<br/>` +
          `Lng: ${pos.longitude.toFixed(6)}`
        );
      }
      if (isNew) userMarker.openPopup();

      const accuracy = pos.accuracy || 0;
      if (accuracyCircle) {
        accuracyCircle.setLatLng(latlng);
        accuracyCircle.setRadius(accuracy);
      } else if (accuracy > 0) {
        accuracyCircle = L.circle(latlng, {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
      }

      const accText = accuracy > 0 ? ` ±${Math.round(accuracy)}m` : '';
      locationMessage = `Lat: ${pos.latitude.toFixed(6)}, Lng: ${pos.longitude.toFixed(6)}${accText}`;
      dispatch('locationFound', pos);
    } catch (err) {
      locationMessage = err.message;
      dispatch('locationError', { message: err.message });
    } finally {
      locating = false;
    }
  }
</script>

<div class="map-wrapper">
  <div bind:this={container} style="height: {height}; width: {width};"></div>
  <button
    class="locate-btn"
    on:click={locateUser}
    disabled={locating}
    title="Mostrar mi ubicación"
  >
    {locating ? 'Obteniendo...' : 'Mi ubicación'}
  </button>
  {#if locationMessage}
    <div class="location-message">{locationMessage}</div>
  {/if}
</div>

<style>
  .map-wrapper {
    position: relative;
  }

  .locate-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    padding: 8px 14px;
    background-color: white;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .locate-btn:hover:not(:disabled) {
    background-color: #f0f0f0;
  }

  .locate-btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .location-message {
    position: absolute;
    bottom: 10px;
    left: 10px;
    z-index: 1000;
    padding: 6px 10px;
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
</style>
