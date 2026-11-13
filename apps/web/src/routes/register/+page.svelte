<script>
  import { setAuth } from '$lib/stores';
  import { API_URL } from '$lib/api';
  import { supabase } from '$lib/supabase';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirm = $state('');
  let error = $state('');
  let loading = $state(false);

  async function submit(e) {
    e.preventDefault();
    error = '';
    if (password !== confirm) { error = 'Las contraseñas no coinciden'; return; }
    loading = true;
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Error al registrarse');
      setAuth(body.token, body.user);
      location.href = '/';
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function registerWithGoogle() {
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
    <h1 style="margin-top:0;">Crear cuenta</h1>
    {#if error}<div class="error">{error}</div>{/if}
    <form onsubmit={submit}>
      <div class="field">
        <label for="name">Nombre</label>
        <input id="name" type="text" bind:value={name} required />
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" bind:value={email} required />
      </div>
      <div class="field">
        <label for="password">Contraseña (mín. 8 caracteres)</label>
        <input id="password" type="password" bind:value={password} minlength="8" required />
      </div>
      <div class="field">
        <label for="confirm">Confirmar contraseña</label>
        <input id="confirm" type="password" bind:value={confirm} required />
      </div>
      <button type="submit" disabled={loading} style="width:100%;">
        {loading ? 'Creando…' : 'Registrarse'}
      </button>
    </form>
    <div class="muted" style="text-align:center;margin:1rem 0;">o</div>
    <button type="button" onclick={registerWithGoogle} style="width:100%;background:#fff;color:#111;border:1px solid #ddd;">
      Registrarse con Google
    </button>
    <p class="muted" style="margin-bottom:0;">¿Ya tienes cuenta? <a href="/login">Inicia sesión</a></p>
  </div>
</div>
