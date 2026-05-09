import { supabase, hasSupabase } from './supabaseClient'

/**
 * Auth Service für HCS Nachweisboard
 * Bietet Login, Register, Magic Link und Session Management
 */

// Session State
let currentUser = null
let sessionListeners = []

/**
 * Current user holen
 */
export function getCurrentUser() {
  return currentUser
}

/**
 * Prüfen ob User eingeloggt ist
 */
export function isAuthenticated() {
  return currentUser !== null
}

/**
 * Session Listener registrieren
 */
export function onAuthStateChange(callback) {
  sessionListeners.push(callback)
  return () => {
    sessionListeners = sessionListeners.filter(listener => listener !== callback)
  }
}

/**
 * Mit Email/Password login
 */
export async function signInWithEmail(email, password) {
  if (!supabase) {
    throw new Error('Supabase nicht konfiguriert')
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  currentUser = data.user
  sessionListeners.forEach(cb => cb(currentUser))
  return data
}

/**
 * Mit Magic Link login (passwortlos)
 */
export async function signInWithMagicLink(email, redirectUrl) {
  if (!supabase) {
    throw new Error('Supabase nicht konfiguriert')
  }
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl || window.location.origin
    }
  })
  
  if (error) throw error
  return { success: true, message: 'Magic Link wurde an deine E-Mail gesendet!' }
}

/**
 * Neuer User registrieren
 */
export async function signUpWithEmail(email, password, metadata = {}) {
  if (!supabase) {
    throw new Error('Supabase nicht konfiguriert')
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...metadata,
        full_name: metadata.fullName || ''
      },
      emailRedirectTo: window.location.origin
    }
  })
  
  if (error) throw error
  return { 
    success: true, 
    message: 'Bitte prüfe deine E-Mails zur Bestätigung!',
    user: data.user 
  }
}

/**
 * Logout
 */
export async function signOut() {
  if (!supabase) {
    currentUser = null
    sessionListeners.forEach(cb => cb(null))
    return
  }
  
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  currentUser = null
  sessionListeners.forEach(cb => cb(null))
}

/**
 * Session beim App-Start wiederherstellen
 */
export async function restoreSession() {
  if (!supabase) {
    return null
  }
  
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Session restore error:', error)
    return null
  }
  
  currentUser = session?.user || null
  sessionListeners.forEach(cb => cb(currentUser))
  return session
}

/**
 * Auth State Changes abonnieren (für Realtime Updates)
 */
export function subscribeToAuthChanges() {
  if (!supabase) return () => {}
  
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event)
    currentUser = session?.user || null
    sessionListeners.forEach(cb => cb(currentUser))
  }).data.subscription
}

/**
 * Password zurücksetzen anfordern
 */
export async function resetPassword(email) {
  if (!supabase) {
    throw new Error('Supabase nicht konfiguriert')
  }
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#reset-password`
  })
  
  if (error) throw error
  return { success: true, message: 'Password-Reset Link wurde gesendet!' }
}

/**
 * User Profile aktualisieren
 */
export async function updateUserProfile(updates) {
  if (!supabase || !currentUser) {
    throw new Error('Nicht eingeloggt')
  }
  
  const { data, error } = await supabase.auth.updateUser({
    data: updates
  })
  
  if (error) throw error
  currentUser = data.user
  sessionListeners.forEach(cb => cb(currentUser))
  return data
}
