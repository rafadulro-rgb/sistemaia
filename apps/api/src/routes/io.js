const express = require('express');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { loadBalancer } = require('../loadbalancer');

const router = express.Router();
router.use(requireAuth);

function toCsv(rows, fields) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = fields.map((f) => esc(f.label)).join(',');
  const body = rows.map((r) => fields.map((f) => esc(r[f.key])).join(','));
  return [header, ...body].join('\n');
}

// GET /api/export?format=json|csv&what=all|transactions|accounts|categories
router.get('/', async (req, res) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const what = req.query.what || 'all';

  const dump = {};
  try {
    if (what === 'all' || what === 'accounts') {
      const { data, error } = await supabase.from('accounts').select('*').eq('user_id', req.user.id);
      if (error) throw error;
      dump.accounts = data;
    }
    if (what === 'all' || what === 'categories') {
      const { data, error } = await supabase.from('categories').select('*').eq('user_id', req.user.id);
      if (error) throw error;
      dump.categories = data;
    }
    if (what === 'all' || what === 'transactions') {
      const { data, error } = await supabase
        .from('transactions').select('*').eq('user_id', req.user.id).order('date');
      if (error) throw error;
      dump.transactions = data;
    }
    dump.exportedAt = new Date().toISOString();
    dump.version = 1;

    if (format === 'csv') {
      // CSV solo tiene sentido para transacciones
      const fields = [
        { key: 'date', label: 'date' },
        { key: 'type', label: 'type' },
        { key: 'amount', label: 'amount' },
        { key: 'description', label: 'description' },
        { key: 'account_id', label: 'account_id' },
        { key: 'category_id', label: 'category_id' },
      ];
      const csv = toCsv(dump.transactions || [], fields);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="transacciones.csv"');
      return res.send('﻿' + csv); // BOM para Excel
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="respaldo.json"');
    res.json(dump);
  } catch (err) {
    res.status(500).json({ error: 'Error exportando datos' });
  }
});

// POST /api/import  body: { format: 'json', data: <dump> }
router.post('/import', async (req, res) => {
  const { format = 'json', data } = req.body || {};
  if (format !== 'json' || !data) {
    return res.status(400).json({ error: 'Solo se soporta importación JSON con { format, data }' });
  }

  try {
    const result = await loadBalancer.dispatch('import', async () => {
      const out = { accounts: 0, categories: 0, transactions: 0, skipped: 0 };

      // 1) Cuentas nuevas (se insertan y se mapea id viejo -> nuevo)
      const accountMap = {};
      if (Array.isArray(data.accounts)) {
        for (const a of data.accounts) {
          const { data: ins, error } = await supabase
            .from('accounts')
            .insert({
              user_id: req.user.id,
              name: a.name,
              type: a.type || 'other',
              balance: Number(a.balance) || 0,
              currency: a.currency || 'USD',
            })
            .select('id').single();
          if (error) { out.skipped++; continue; }
          accountMap[a.id] = ins.id;
          out.accounts++;
        }
      }

      // 2) Categorías
      const categoryMap = {};
      if (Array.isArray(data.categories)) {
        for (const c of data.categories) {
          const { data: ins, error } = await supabase
            .from('categories')
            .insert({ user_id: req.user.id, name: c.name, type: c.type || 'expense', color: c.color || '#6366f1' })
            .select('id').single();
          if (error) { out.skipped++; continue; }
          categoryMap[c.id] = ins.id;
          out.categories++;
        }
      }

      // 3) Transacciones (solo si sus referencias existen en el mapa o ya en BD)
      if (Array.isArray(data.transactions)) {
        const { data: existingAcc } = await supabase.from('accounts').select('id').eq('user_id', req.user.id);
        const { data: existingCat } = await supabase.from('categories').select('id').eq('user_id', req.user.id);
        const validAcc = new Set([...(existingAcc || []).map((x) => x.id), ...Object.values(accountMap)]);
        const validCat = new Set([...(existingCat || []).map((x) => x.id), ...Object.values(categoryMap)]);

        const rows = data.transactions
          .map((t) => ({
            user_id: req.user.id,
            account_id: accountMap[t.account_id] || t.account_id,
            category_id: categoryMap[t.category_id] || t.category_id,
            type: t.type === 'income' ? 'income' : 'expense',
            amount: Number(t.amount) || 0,
            description: t.description || '',
            date: t.date,
          }))
          .filter((t) => t.date && validAcc.has(t.account_id) && validCat.has(t.category_id));

        if (rows.length) {
          const { error } = await supabase.from('transactions').insert(rows);
          if (!error) out.transactions = rows.length;
          else out.skipped += rows.length;
        }
      }

      return out;
    });

    res.json({ ok: true, imported: result });
  } catch (err) {
    res.status(500).json({ error: 'Error importando datos' });
  }
});

module.exports = router;
