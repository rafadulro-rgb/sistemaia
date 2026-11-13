<script>
  import { setAuth } from '$lib/stores';
  import { supabase } from '$lib/supabase';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

  async function submit(e) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al iniciar sesión');
      setAuth(body.token, body.user);
      location.href = '/';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loginWithGoogle() {
    error = '';
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (oauthError) error = oauthError.message;
  }
</script>

<div style="max-width:400px;margin:4rem auto;">
  <div class="card">
    <h1 style="margin-top:0;">Iniciar sesión</h1>
    {#if error}<div class="error">{error}</div>{/if}
    <form onsubmit={submit}>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input id="password" type="password" bind:value={password} required />
      </div>
      <button type="submit" disabled={loading} style="width:100%;">
        {loading ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
    <div class="muted" style="text-align:center;margin:1rem 0;">o</div>
    <button type="button" onclick={loginWithGoogle} style="width:100%;background:#fff;color:#111;border:1px solid #ddd;">
      Continuar con Google
    </button>
    <p class="muted" style="margin-bottom:0;">¿No tienes cuenta? <a href="/register">Regístrate</a></p>
  </div>
</div>
