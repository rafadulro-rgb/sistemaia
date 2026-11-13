const express = require('express');
const { supabase } = require('../db');
const { loadBalancer } = require('../loadbalancer');

const router = express.Router();

router.get('/health', async (req, res) => {
  let db = 'ok';
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) db = 'error';
  } catch {
    db = 'error';
  }
  res.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    loadBalancer: loadBalancer.status(),
    uptime: process.uptime(),
  });
});

router.get('/exchange-rate', async (req, res) => {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    
    if (data.rates && data.rates.MXN) {
      res.json({
        base: 'USD',
        target: 'MXN',
        rate: data.rates.MXN,
        date: data.date
      });
    } else {
      res.status(500).json({ error: 'No se pudo obtener el tipo de cambio' });
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ error: 'Error al obtener tipo de cambio' });
  }
});

module.exports = router;
