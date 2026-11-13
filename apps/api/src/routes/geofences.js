const express = require('express');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const TYPES = ['polygon', 'circle', 'rectangle', 'polyline'];

// Listar todas las geocercas del usuario
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('geofences')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Crear una nueva geocerca
router.post('/', async (req, res) => {
  const { name, geojson, type, is_active = true } = req.body || {};
  
  if (!name) {
    return res.status(400).json({ error: 'name es obligatorio' });
  }
  if (!geojson) {
    return res.status(400).json({ error: 'geojson es obligatorio' });
  }
  if (!type || !TYPES.includes(type)) {
    return res.status(400).json({ error: `type debe ser uno de: ${TYPES.join(', ')}` });
  }

  const { data, error } = await supabase
    .from('geofences')
    .insert({
      user_id: req.user.id,
      name,
      geojson,
      type,
      is_active
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Actualizar una geocerca
router.put('/:id', async (req, res) => {
  const { name, geojson, type, is_active } = req.body || {};
  const updates = {};
  
  if (name !== undefined) updates.name = name;
  if (geojson !== undefined) updates.geojson = geojson;
  if (type !== undefined) {
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'type inválido' });
    updates.type = type;
  }
  if (is_active !== undefined) updates.is_active = is_active;
  
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'Sin campos a actualizar' });
  }

  const { data, error } = await supabase
    .from('geofences')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  res.json(data);
});

// Eliminar una geocerca
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('geofences')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Obtener eventos de una geocerca específica
router.get('/:id/events', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  const { data, error } = await supabase
    .from('geofence_events')
    .select('*')
    .eq('geofence_id', req.params.id)
    .eq('user_id', req.user.id)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Obtener todos los eventos del usuario
router.get('/events/all', async (req, res) => {
  const { limit = 50, offset = 0, event_type } = req.query;
  
  let query = supabase
    .from('geofence_events')
    .select('*')
    .eq('user_id', req.user.id)
    .order('occurred_at', { ascending: false });
  
  if (event_type) {
    query = query.eq('event_type', event_type);
  }
  
  const { data, error } = await query.range(offset, offset + limit - 1);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Registrar un evento de entrada/salida (para uso interno del sistema de tracking)
router.post('/events', async (req, res) => {
  const { geofence_id, event_type, latitude, longitude, accuracy } = req.body || {};
  
  if (!geofence_id) {
    return res.status(400).json({ error: 'geofence_id es obligatorio' });
  }
  if (!event_type || !['enter', 'exit'].includes(event_type)) {
    return res.status(400).json({ error: 'event_type debe ser "enter" o "exit"' });
  }
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude y longitude son obligatorios' });
  }

  const { data, error } = await supabase
    .from('geofence_events')
    .insert({
      geofence_id,
      user_id: req.user.id,
      event_type,
      latitude,
      longitude,
      accuracy
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;
