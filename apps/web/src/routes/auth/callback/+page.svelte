<script>
  import { onMount } from 'svelte';
  import { API_URL } from '$lib/api';
  import { supabase } from '$lib/supabase';
  import { setAuth } from '$lib/stores';

  let error = $state('');

  async function finishLogin(accessToken) {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Error al iniciar sesión con Google');
    setAuth(body.token, body.user);
    location.href = '/';
  }

  onMount(async () => {
    try {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const oauthError = params.get('error_description') || params.get('error');

      if (oauthError) throw new Error(oauthError);

      let session = null;
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        session = data.session;
      } else {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (!session?.access_token) throw new Error('No se recibió sesión de Supabase');
      await finishLogin(session.access_token);
    } catch (err) {
      error = err.message || 'Error al autenticarse con Google';
    }
  });
</script>

<div style="max-width:400px;margin:4rem auto;">
  <div class="card" style="text-align:center;">
    {#if error}
      <h1 style="margin-top:0;">Error de autenticación</h1>
      <div class="error">{error}</div>
      <p class="muted"><a href="/login">Volver a iniciar sesión</a></p>
    {:else}
      <h1 style="margin-top:0;">Conectando…</h1>
      <p class="muted" style="margin-bottom:0;">Completando el inicio de sesión con Google.</p>
    {/if}
  </div>
</div>
