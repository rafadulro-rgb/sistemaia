import { geolocationService } from './geolocation.js';
import { geofencesApi } from './api.js';

class GeofenceDetector {
  constructor() {
    this.activeGeofences = [];
    this.geofenceStates = new Map(); // geofenceId -> { inside: boolean, lastCheck: timestamp }
    this.tracking = false;
    this.listeners = [];
    this.watchInterval = null;
  }

  // Cargar geocercas activas
  async loadActiveGeofences() {
    try {
      const allGeofences = await geofencesApi.list();
      this.activeGeofences = allGeofences.filter(g => g.is_active);
      
      // Inicializar estados
      this.activeGeofences.forEach(geofence => {
        if (!this.geofenceStates.has(geofence.id)) {
          this.geofenceStates.set(geofence.id, {
            inside: false,
            lastCheck: null
          });
        }
      });
      
      return this.activeGeofences;
    } catch (error) {
      console.error('Error cargando geocercas activas:', error);
      throw error;
    }
  }

  // Iniciar detección automática
  async startDetection() {
    if (this.tracking) {
      console.log('Detección ya activa');
      return;
    }

    try {
      await this.loadActiveGeofences();
      await geolocationService.startTracking();
      
      this.tracking = true;
      
      // Verificar posición cada 5 segundos
      this.watchInterval = setInterval(() => {
        this.checkGeofences();
      }, 5000);
      
      console.log('Detección de geocercas iniciada');
    } catch (error) {
      console.error('Error iniciando detección:', error);
      throw error;
    }
  }

  // Detener detección
  stopDetection() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    
    geolocationService.stopTracking();
    this.tracking = false;
    console.log('Detección de geocercas detenida');
  }

  // Verificar geocercas con la posición actual
  async checkGeofences() {
    const position = geolocationService.currentPosition;
    if (!position) return;

    for (const geofence of this.activeGeofences) {
      const isInside = this.isPointInGeofence(
        position.latitude,
        position.longitude,
        geofence
      );

      const state = this.geofenceStates.get(geofence.id);
      
      // Detectar cambio de estado
      if (state.inside !== isInside) {
        const eventType = isInside ? 'enter' : 'exit';
        
        // Actualizar estado
        state.inside = isInside;
        state.lastCheck = Date.now();
        
        // Notificar listeners
        this.notifyListeners({
          geofence,
          eventType,
          position,
          timestamp: new Date()
        });
        
        // Guardar evento en la base de datos
        await this.saveEvent(geofence.id, eventType, position);
      }
    }
  }

  // Verificar si un punto está dentro de una geocerca
  isPointInGeofence(lat, lng, geofence) {
    const geojson = geofence.geojson;
    const type = geofence.type;

    switch (type) {
      case 'polygon':
        return this.isPointInPolygon(lat, lng, geojson);
      case 'circle':
        return this.isPointInCircle(lat, lng, geojson);
      case 'rectangle':
        return this.isPointInRectangle(lat, lng, geojson);
      case 'polyline':
        // Para polylines, verificamos si el punto está cerca de la línea
        return this.isPointNearPolyline(lat, lng, geojson, 50); // 50 metros de tolerancia
      default:
        return false;
    }
  }

  // Verificar si un punto está dentro de un polígono (Ray Casting)
  isPointInPolygon(lat, lng, geojson) {
    const coordinates = geojson.geometry.coordinates[0]; // El primer anillo es el exterior
    let inside = false;
    
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      const xi = coordinates[i][0];
      const yi = coordinates[i][1];
      const xj = coordinates[j][0];
      const yj = coordinates[j][1];
      
      if (((yi > lat) !== (yj > lat)) &&
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  // Verificar si un punto está dentro de un círculo
  isPointInCircle(lat, lng, geojson) {
    const center = geojson.geometry.coordinates; // [lng, lat]
    const radius = geojson.properties?.radius || 100; // metros (default 100)
    
    const distance = geolocationService.calculateDistance(
      lat, lng,
      center[1], center[0]
    );
    
    return distance <= radius;
  }

  // Verificar si un punto está dentro de un rectángulo
  isPointInRectangle(lat, lng, geojson) {
    const coordinates = geojson.geometry.coordinates[0]; // [ [lng1, lat1], [lng2, lat2], ... ]
    
    // Encontrar los límites
    const lats = coordinates.map(c => c[1]);
    const lngs = coordinates.map(c => c[0]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  // Verificar si un punto está cerca de una polyline
  isPointNearPolyline(lat, lng, geojson, tolerance) {
    const coordinates = geojson.geometry.coordinates;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];
      
      const distance = this.pointToLineDistance(
        lat, lng,
        p1[1], p1[0],
        p2[1], p2[0]
      );
      
      if (distance <= tolerance) {
        return true;
      }
    }
    
    return false;
  }

  // Calcular distancia de un punto a una línea
  pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy) * 111139; // Convertir a metros (aprox)
  }

  // Guardar evento en la base de datos
  async saveEvent(geofenceId, eventType, position) {
    try {
      await geofencesApi.createEvent({
        geofence_id: geofenceId,
        event_type: eventType,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy
      });
      
      console.log(`Evento ${eventType} guardado para geocerca ${geofenceId}`);
    } catch (error) {
      console.error('Error guardando evento:', error);
    }
  }

  // Suscribir a eventos de geocerca
  onGeofenceEvent(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notificar a todos los listeners
  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  // Verificar manualmente una posición específica
  async checkPosition(lat, lng) {
    await this.loadActiveGeofences();
    
    const results = [];
    
    for (const geofence of this.activeGeofences) {
      const isInside = this.isPointInGeofence(lat, lng, geofence);
      results.push({
        geofence,
        inside: isInside
      });
    }
    
    return results;
  }
}

// Singleton instance
export const geofenceDetector = new GeofenceDetector();
