import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await login(email, password)
    setSubmitting(false)
    if (res.success) {
      navigate('/admin/dashboard')
    } else {
      setError(res.message || 'Login failed.')
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src="/HE Logo.png" alt="HE Logo" className="login-logo-img" />
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button className="btn btn-gold" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
