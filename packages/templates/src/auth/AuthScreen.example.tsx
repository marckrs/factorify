// ============================================================
// AuthScreen — Example / Reference Implementation
// ============================================================
// Status: scaffold (nao testado em producao ainda)
// Quando usado no primeiro produto real, mova para AuthScreen.tsx
// e atualize status para 'in-progress' no registry.
// ============================================================

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface AuthScreenProps {
  productName:   string
  logoUrl?:      string
  primaryColor?: string
  redirectUrl?:  string
  providers?:    Array<'google' | 'github' | 'email'>
  supabaseUrl:   string
  supabaseKey:   string
}

type AuthMode = 'login' | 'signup' | 'forgot'

export function AuthScreen({
  productName,
  logoUrl,
  primaryColor  = '#7F77DD',
  redirectUrl   = '/dashboard',
  providers     = ['google', 'email'],
  supabaseUrl,
  supabaseKey,
}: AuthScreenProps) {
  const [mode,     setMode]     = useState<AuthMode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  const supabase = createClient(supabaseUrl, supabaseKey)

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })
        if (error) throw error
        setSuccess('Email de recuperacao enviado!')
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}${redirectUrl}` },
        })
        if (error) throw error
        setSuccess('Verifique seu email para confirmar o cadastro.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = redirectUrl
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSocial(provider: 'google' | 'github') {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectUrl}` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  const titles: Record<AuthMode, string> = {
    login:  `Entrar no ${productName}`,
    signup: `Criar conta no ${productName}`,
    forgot: 'Recuperar senha',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f0f0e', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#1a1a18', borderRadius: '16px',
        border: '0.5px solid #333', padding: '40px 32px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {logoUrl
            ? <img src={logoUrl} alt={productName} style={{ height: '40px', marginBottom: '16px' }} />
            : <div style={{ fontSize: '24px', fontWeight: 600, color: '#e8e6e0', marginBottom: '8px' }}>{productName}</div>
          }
          <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>{titles[mode]}</p>
        </div>

        {mode !== 'forgot' && providers.includes('google') && (
          <button onClick={() => handleSocial('google')} disabled={loading}
            style={{ width: '100%', padding: '10px', marginBottom: '8px', background: 'transparent', border: '0.5px solid #333', borderRadius: '8px', color: '#e8e6e0', fontSize: '14px', cursor: 'pointer' }}>
            Continuar com Google
          </button>
        )}

        {mode !== 'forgot' && providers.includes('github') && (
          <button onClick={() => handleSocial('github')} disabled={loading}
            style={{ width: '100%', padding: '10px', marginBottom: '8px', background: 'transparent', border: '0.5px solid #333', borderRadius: '8px', color: '#e8e6e0', fontSize: '14px', cursor: 'pointer' }}>
            Continuar com GitHub
          </button>
        )}

        {mode !== 'forgot' && providers.includes('email') && providers.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '12px' }}>
            <div style={{ flex: 1, height: '0.5px', background: '#333' }} />
            <span style={{ fontSize: '12px', color: '#555' }}>ou</span>
            <div style={{ flex: 1, height: '0.5px', background: '#333' }} />
          </div>
        )}

        {providers.includes('email') && (
          <form onSubmit={handleEmail}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', marginBottom: '8px', background: '#111', border: '0.5px solid #333', borderRadius: '8px', color: '#e8e6e0', fontSize: '14px', boxSizing: 'border-box' }} />
            {mode !== 'forgot' && (
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '10px 12px', marginBottom: '16px', background: '#111', border: '0.5px solid #333', borderRadius: '8px', color: '#e8e6e0', fontSize: '14px', boxSizing: 'border-box' }} />
            )}
            {error   && <p style={{ color: '#E24B4A', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
            {success && <p style={{ color: '#1D9E75', fontSize: '13px', marginBottom: '12px' }}>{success}</p>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', background: primaryColor, border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar email'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
          {mode === 'login' && (
            <>
              <span>Nao tem conta? </span>
              <button onClick={() => setMode('signup')} style={{ color: primaryColor, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Cadastre-se</button>
              <br />
              <button onClick={() => setMode('forgot')} style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', marginTop: '8px' }}>Esqueci minha senha</button>
            </>
          )}
          {mode !== 'login' && (
            <button onClick={() => setMode('login')} style={{ color: primaryColor, background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Voltar para login</button>
          )}
        </div>
      </div>
    </div>
  )
}
