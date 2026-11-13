const express = require('express');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('categories').select('*').eq('user_id', req.user.id).order('type').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, type, color = '#6366f1' } = req.body || {};
  if (!name || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'name es obligatorio; type debe ser income o expense' });
  }
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: req.user.id, name, type, color })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { name, type, color } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) {
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type inválido' });
    updates.type = type;
  }
  if (color !== undefined) updates.color = color;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Sin campos a actualizar' });

  const { data, error } = await supabase
    .from('categories').update(updates)
    .eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('categories').delete()
    .eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
