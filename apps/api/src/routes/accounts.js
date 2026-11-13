const express = require('express');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const TYPES = ['bank', 'credit_card', 'savings', 'cash', 'other'];

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('accounts').select('*').eq('user_id', req.user.id).order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, type, balance = 0, currency = 'USD' } = req.body || {};
  if (!name || !TYPES.includes(type)) {
    return res.status(400).json({ error: `name es obligatorio; type debe ser uno de: ${TYPES.join(', ')}` });
  }
  const { data, error } = await supabase
    .from('accounts')
    .insert({ user_id: req.user.id, name, type, balance, currency })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { name, type, balance, currency } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) {
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'type inválido' });
    updates.type = type;
  }
  if (balance !== undefined) updates.balance = balance;
  if (currency !== undefined) updates.currency = currency;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Sin campos a actualizar' });

  const { data, error } = await supabase
    .from('accounts').update(updates)
    .eq('id', req.params.id).eq('user_id', req.user.id).select().single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('accounts').delete()
    .eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
