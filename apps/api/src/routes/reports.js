const express = require('express');
const { supabase } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { loadBalancer } = require('../loadbalancer');

const router = express.Router();
router.use(requireAuth);

function rangeFor(period, dateStr) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();

  if (period === 'daily') {
    const start = new Date(y, m, d);
    const end = new Date(y, m, d, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: start.toISOString().slice(0, 10) };
  }
  if (period === 'monthly') {
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: `${y}-${String(m + 1).padStart(2, '0')}` };
  }
  if (period === 'annual') {
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: String(y) };
  }
  return null;
}

router.get('/summary', async (req, res) => {
  const { period = 'monthly', date } = req.query;
  const range = rangeFor(period, date);
  if (!range) return res.status(400).json({ error: 'period debe ser daily|monthly|annual y date con formato YYYY-MM-DD' });

  try {
    // La agregación se despacha al balanceador de cargas
    const report = await loadBalancer.dispatch(`report-${period}`, async () => {
      const { data: txs, error } = await supabase
        .from('transactions')
        .select('type, amount, category_id, account_id, categories(name, type), accounts(name, type)')
        .eq('user_id', req.user.id)
        .gte('date', range.start)
        .lte('date', range.end);
      if (error) throw error;

      let income = 0, expense = 0;
      const byCategory = {};
      const byAccount = {};

      for (const t of txs || []) {
        const amt = Number(t.amount);
        if (t.type === 'income') income += amt; else expense += amt;

        const catName = t.categories?.name || 'Sin categoría';
        const catType = t.categories?.type || t.type;
        byCategory[catName] = byCategory[catName] || { name: catName, type: catType, income: 0, expense: 0 };
        if (t.type === 'income') byCategory[catName].income += amt;
        else byCategory[catName].expense += amt;

        const accName = t.accounts?.name || 'Sin cuenta';
        byAccount[accName] = byAccount[accName] || { name: accName, income: 0, expense: 0 };
        if (t.type === 'income') byAccount[accName].income += amt;
        else byAccount[accName].expense += amt;
      }

      return {
        period,
        range: { start: range.start.slice(0, 10), end: range.end.slice(0, 10), label: range.label },
        totals: { income, expense, balance: income - expense, count: (txs || []).length },
        byCategory: Object.values(byCategory).sort((a, b) => (b.income + b.expense) - (a.income + a.expense)),
        byAccount: Object.values(byAccount),
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

module.exports = router;
