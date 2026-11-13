class GeolocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.listeners = [];
    this.tracking = false;
  }

  // Verificar si el navegador soporta geolocalización
  isSupported() {
    return 'geolocation' in navigator;
  }

  // Iniciar rastreo de posición
  startTracking(options = {}) {
    if (!this.isSupported()) {
      return Promise.reject(new Error('Geolocalización no soportada en este navegador'));
    }

    if (this.tracking) {
      return Promise.resolve(this.currentPosition);
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    };

    return new Promise((resolve, reject) => {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };
          this.tracking = true;
          this.notifyListeners(this.currentPosition);
          resolve(this.currentPosition);
        },
        (error) => {
          console.error('Error de geolocalización:', error);
          reject(new Error(this.getErrorMessage(error)));
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  // Detener rastreo
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.tracking = false;
    }
  }

  // Obtener posición actual (única)
  getCurrentPosition(options = {}) {
    if (!this.isSupported()) {
      return Promise.reject(new Error('Geolocalización no soportada en este navegador'));
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          };
          resolve(this.currentPosition);
        },
        (error) => {
          reject(new Error(this.getErrorMessage(error)));
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  // Suscribir a cambios de posición
  onPositionChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notificar a todos los listeners
  notifyListeners(position) {
    this.listeners.forEach(callback => callback(position));
  }

  // Obtener mensaje de error legible
  getErrorMessage(error) {
    console.error('Detalles del error de geolocalización:', {
      code: error.code,
      message: error.message,
      PERMISSION_DENIED: error.PERMISSION_DENIED,
      POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
      TIMEOUT: error.TIMEOUT
    });

    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return 'Permiso de geolocalización denegado. Por favor, habilita el acceso a la ubicación en tu navegador.';
      case 2: // POSITION_UNAVAILABLE
        return 'Información de posición no disponible. Verifica que tu GPS esté activado.';
      case 3: // TIMEOUT
        return 'Tiempo de espera agotado al obtener posición. Intenta nuevamente.';
      default:
        return `Error desconocido al obtener posición (código: ${error.code}). ${error.message || ''}`;
    }
  }

  // Calcular distancia entre dos puntos (en metros)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

// Singleton instance
export const geolocationService = new GeolocationService();
