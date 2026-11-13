const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../db');
const { signToken } = require('../middleware/auth');

const router = express.Router();
const ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

const DEFAULT_CATEGORIES = [
  { name: 'Salario', type: 'income', color: '#22c55e' },
  { name: 'Otros ingresos', type: 'income', color: '#4ade80' },
  { name: 'Comida', type: 'expense', color: '#f97316' },
  { name: 'Transporte', type: 'expense', color: '#3b82f6' },
  { name: 'Vivienda', type: 'expense', color: '#8b5cf6' },
  { name: 'Servicios', type: 'expense', color: '#06b6d4' },
  { name: 'Ocio', type: 'expense', color: '#ec4899' },
  { name: 'Salud', type: 'expense', color: '#ef4444' },
  { name: 'Educación', type: 'expense', color: '#eab308' },
  { name: 'Otros gastos', type: 'expense', color: '#64748b' },
];

async function createDefaults(userId) {
  const categories = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
  await supabase.from('categories').insert(categories);
  await supabase.from('accounts').insert({
    user_id: userId, name: 'Efectivo', type: 'cash', balance: 0, currency: 'USD',
  });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const { data: existing } = await supabase
      .from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

    const password_hash = await bcrypt.hash(password, ROUNDS);
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({ name, email: email.toLowerCase(), password_hash })
      .select('id, name, email, created_at')
      .single();
    if (error) throw error;

    await createDefaults(profile.id);

    res.status(201).json({ token: signToken(profile.id), user: profile });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const { data: profile, error } = await supabase
      .from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
    if (error) throw error;
    if (!profile || !profile.password_hash) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, profile.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    res.json({
      token: signToken(profile.id),
      user: { id: profile.id, name: profile.name, email: profile.email },
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Login/registro con Google vía Supabase Auth (OAuth)
router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body || {};
    if (!access_token) {
      return res.status(400).json({ error: 'access_token es obligatorio' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(access_token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Token de Supabase inválido' });
    }

    let profile = null;

    // 1) Buscar por supabase_id
    const { data: byAuthId } = await supabase
      .from('profiles').select('*').eq('supabase_id', user.id).maybeSingle();
    if (byAuthId) profile = byAuthId;

    // 2) Buscar por email y vincular
    const email = (user.email || '').toLowerCase();
    if (!profile && email) {
      const { data: byEmail } = await supabase
        .from('profiles').select('*').eq('email', email).maybeSingle();
      if (byEmail) {
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const { data: updated } = await supabase
          .from('profiles')
          .update({ supabase_id: user.id, name: byEmail.name || metaName || email })
          .eq('id', byEmail.id)
          .select()
          .single();
        profile = updated || byEmail;
      }
    }

    // 3) Crear perfil nuevo con datos por defecto
    if (!profile) {
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const name = (metaName || email || 'Usuario').slice(0, 120);
      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({
          name,
          email: email || `google-${user.id}@users.noreply.local`,
          supabase_id: user.id,
        })
        .select('id, name, email, created_at')
        .single();
      if (insertError) throw insertError;
      profile = created;
      await createDefaults(profile.id);
    }

    res.json({
      token: signToken(profile.id),
      user: { id: profile.id, name: profile.name, email: profile.email },
    });
  } catch (err) {
    console.error('[auth/google]', err);
    res.status(500).json({ error: 'Error al autenticar con Google' });
  }
});

module.exports = router;
