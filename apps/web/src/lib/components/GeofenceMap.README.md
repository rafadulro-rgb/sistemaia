# GeofenceMap Component

Componente de Svelte independiente para dibujar geocercas usando Leaflet y Leaflet Draw.

## Instalación

Las dependencias ya están instaladas:
- `leaflet`
- `leaflet-draw`

## Uso Básico

```svelte
<script>
  import GeofenceMap from '$lib/components/GeofenceMap.svelte';

  let mapComponent;

  function handleGeofenceCreated(event) {
    console.log('Geocerca creada:', event);
  }
</script>

<GeofenceMap
  bind:this={mapComponent}
  height="600px"
  initialCenter={[19.4326, -99.1332]}
  initialZoom={13}
  on:geofenceCreated={handleGeofenceCreated}
/>
```

## Props

- `initialCenter` (array): Coordenadas iniciales del mapa [lat, lng]. Default: [19.4326, -99.1332]
- `initialZoom` (number): Nivel de zoom inicial. Default: 13
- `height` (string): Altura del contenedor. Default: '500px'
- `width` (string): Ancho del contenedor. Default: '100%'
- `allowDraw` (boolean): Permitir dibujar nuevas geocercas. Default: true
- `allowEdit` (boolean): Permitir editar geocercas existentes. Default: true
- `allowDelete` (boolean): Permitir eliminar geocercas. Default: true

## Eventos

- `geofenceCreated`: Se dispara cuando se crea una nueva geocerca
- `geofenceEdited`: Se dispara cuando se edita una geocerca
- `geofenceDeleted`: Se dispara cuando se elimina una geocerca

## Métodos Exponen

Puedes acceder a estos métodos usando `bind:this`:

- `addGeofence(geojson)`: Agrega una geocerca desde GeoJSON
- `clearGeofences()`: Limpia todas las geocercas del mapa
- `getGeofences()`: Retorna todas las geocercas en formato GeoJSON
- `setView(center, zoom)`: Cambia la vista del mapa
- `fitBounds(bounds)`: Ajusta el mapa a los límites especificados

## Ejemplo con Funcionalidad Completa

```svelte
<script>
  import GeofenceMap from '$lib/components/GeofenceMap.svelte';

  let mapComponent;
  let geofencesData = [];

  function handleGeofenceCreated(event) {
    geofencesData = [...geofencesData, event];
  }

  function clearAll() {
    mapComponent.clearGeofences();
    geofencesData = [];
  }

  function exportGeofences() {
    const geojson = mapComponent.getGeofences();
    console.log(geojson);
  }
</script>

<div class="controls">
  <button on:click={clearAll}>Limpiar</button>
  <button on:click={exportGeofences}>Exportar</button>
</div>

<GeofenceMap
  bind:this={mapComponent}
  on:geofenceCreated={handleGeofenceCreated}
/>
```

## Herramientas de Dibujo Disponibles

- Polígono
- Polilínea
- Rectángulo
- Círculo
- Marcador
