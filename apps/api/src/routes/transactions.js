const express = require('express');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

async function adjustBalance(accountId, delta) {
  // Función SQL definida en la migración: UPDATE accounts SET balance = balance + delta
  const { error } = await supabase.rpc('adjust_account_balance', {
    p_account: accountId,
    p_delta: delta,
  });
  if (error) {
    // Fallback: leer y actualizar (menos seguro ante concurrencia)
    const { data } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
    if (data) {
      await supabase.from('accounts').update({ balance: Number(data.balance) + delta }).eq('id', accountId);
    }
  }
}

function signedAmount(tx) {
  return tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount);
}

router.get('/', async (req, res) => {
  let query = supabase
    .from('transactions')
    .select('*, accounts(name, type), categories(name, color)')
    .eq('user_id', req.user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  const { account_id, category_id, type, from, to, q } = req.query;
  if (account_id) query = query.eq('account_id', account_id);
  if (category_id) query = query.eq('category_id', category_id);
  if (type && ['income', 'expense'].includes(type)) query = query.eq('type', type);
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let rows = data || [];
  if (q) {
    const term = String(q).toLowerCase();
    rows = rows.filter((t) => (t.description || '').toLowerCase().includes(term));
  }
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { account_id, category_id, type, amount, description = '', date } = req.body || {};
  if (!account_id || !category_id || !type || !amount || !date) {
    return res.status(400).json({ error: 'account_id, category_id, type, amount y date son obligatorios' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser income o expense' });
  }

  // Verificar que cuenta y categoría pertenezcan al usuario
  const [{ data: account }, { data: category }] = await Promise.all([
    supabase.from('accounts').select('id').eq('id', account_id).eq('user_id', req.user.id).maybeSingle(),
    supabase.from('categories').select('id').eq('id', category_id).eq('user_id', req.user.id).maybeSingle(),
  ]);
  if (!account) return res.status(400).json({ error: 'Cuenta inválida' });
  if (!category) return res.status(400).json({ error: 'Categoría inválida' });

  const { data, error } = await supabase
    .from('transactions')
    .insert({ user_id: req.user.id, account_id, category_id, type, amount: Number(amount), description, date })
    .select('*, accounts(name, type), categories(name, color)')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await adjustBalance(account_id, signedAmount(data));
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from('transactions').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (findErr) return res.status(500).json({ error: findErr.message });
  if (!existing) return res.status(404).json({ error: 'Transacción no encontrada' });

  const { account_id, category_id, type, amount, description, date } = req.body || {};
  const updates = {};
  if (account_id !== undefined) updates.account_id = account_id;
  if (category_id !== undefined) updates.category_id = category_id;
  if (type !== undefined) {
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type inválido' });
    updates.type = type;
  }
  if (amount !== undefined) updates.amount = Number(amount);
  if (description !== undefined) updates.description = description;
  if (date !== undefined) updates.date = date;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Sin campos a actualizar' });

  // Revertir efecto en balance de la cuenta vieja
  await adjustBalance(existing.account_id, -signedAmount(existing));

  const { data, error } = await supabase
    .from('transactions').update(updates)
    .eq('id', req.params.id).eq('user_id', req.user.id)
    .select('*, accounts(name, type), categories(name, color)').single();
  if (error) {
    await adjustBalance(existing.account_id, signedAmount(existing)); // restaurar
    return res.status(500).json({ error: error.message });
  }

  await adjustBalance(data.account_id, signedAmount(data));
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from('transactions').select('*').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (findErr) return res.status(500).json({ error: findErr.message });
  if (!existing) return res.status(404).json({ error: 'Transacción no encontrada' });

  const { error } = await supabase
    .from('transactions').delete()
    .eq('id', req.params.id).eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  await adjustBalance(existing.account_id, -signedAmount(existing));
  res.json({ ok: true });
});

module.exports = router;
