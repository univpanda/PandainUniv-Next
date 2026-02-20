import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextType'
import { cleanOAuthHash } from '../utils/url'
import { invalidateUserCache, logLoginEvent } from '../lib/cacheApi'
import { generateNewUserIdentity } from '../utils/avatars'

// ============================================================================
// Local Storage Auth Cache - for instant refresh without network delay
// Security: This is UI-only. All actual permissions enforced server-side via RLS.
// ============================================================================
const AUTH_CACHE_KEY = 'panda_auth_profile'
const AUTH_CACHE_TTL = 60 * 60 * 1000 // 1 hour

interface CachedAuthProfile {
  userId: string
  role: string
  isBlocked: boolean
  timestamp: number
}

function getLocalAuthCache(userId: string): CachedAuthProfile | null {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY)
    if (!cached) return null
    const profile = JSON.parse(cached) as CachedAuthProfile
    // Validate: same user and not expired
    if (profile.userId === userId && Date.now() - profile.timestamp < AUTH_CACHE_TTL) {
      return profile
    }
  } catch {
    // Invalid cache
  }
  return null
}

function setLocalAuthCache(userId: string, role: string, isBlocked: boolean): void {
  try {
    const profile: CachedAuthProfile = { userId, role, isBlocked, timestamp: Date.now() }
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(profile))
  } catch {
    // localStorage not available
  }
}

function clearLocalAuthCache(): void {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY)
  } catch {
    // localStorage not available
  }
}

function clearSupabaseAuthStorage(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // localStorage not available
  }

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // sessionStorage not available
  }
}

function isAuthCallbackUrl(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash || ''
  if (
    hash.includes('access_token=') ||
    hash.includes('refresh_token=') ||
    hash.includes('provider_token=')
  ) {
    return true
  }
  const search = window.location.search || ''
  if (search.includes('code=')) {
    return true
  }
  return false
}

function getSupabaseAuthTokenFromStorage(): { access_token?: string } | null {
  const readFrom = (storage: Storage) => {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = storage.getItem(key)
        if (!raw) return null
        try {
          return JSON.parse(raw) as { access_token?: string }
        } catch {
          return null
        }
      }
    }
    return null
  }

  try {
    return readFrom(localStorage)
  } catch {
    // localStorage not available
  }

  try {
    return readFrom(sessionStorage)
  } catch {
    // sessionStorage not available
  }

  return null
}

function isTokenExpired(accessToken: string): boolean {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return false
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '==='.slice((normalized.length + 3) % 4)
    const decoded = JSON.parse(atob(padded)) as { exp?: number }
    if (!decoded.exp) return false
    // 60s skew to avoid edge-of-expiry issues
    return decoded.exp * 1000 < Date.now() + 60_000
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Refs to prevent race conditions
  const isInitialized = useRef(false)
  const hasInvalidatedOnLogin = useRef(false)
  const lastInvalidatedUserId = useRef<string | null>(null)

  const clearAuthState = useCallback(() => {
    clearLocalAuthCache()
    setSession(null)
    setUser(null)
    setIsAdmin(false)
    hasInvalidatedOnLogin.current = false
    lastInvalidatedUserId.current = null
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  // Verify user profile with Supabase (used for background verification)
  const verifyUserProfile = useCallback(
    async (
      newSession: Session,
      isActive: () => boolean
    ): Promise<{ role: string; isBlocked: boolean } | null> => {
      const userId = newSession.user.id

      const { data, error } = await supabase.rpc('get_my_profile_status')

      if (!isActive()) return null

      const status = (data as Array<{ role: string; is_blocked: boolean }> | null)?.[0]

      if (error || !status) {
        // Profile doesn't exist (new user) - create it
        const email = newSession.user.email
        if (email) {
          // Generate username and avatar on frontend
          const identity = generateNewUserIdentity()

          const { error: createError } = await supabase.rpc('create_user_profile', {
            p_user_id: userId,
            p_email: email,
            p_username: identity.username,
            p_avatar_path: identity.avatarPath,
          })

          if (createError) {
            console.error('Failed to create user profile:', createError)
            return null
          }
        }
        // New user - default role
        return { role: 'user', isBlocked: false }
      }

      return { role: status.role ?? 'user', isBlocked: status.is_blocked ?? false }
    },
    []
  )

  // Unified function to handle user session - prevents duplicate calls
  const handleUserSession = useCallback(
    async (
      newSession: Session | null,
      isActive: () => boolean,
      isInitialLoad: boolean = false
    ): Promise<boolean> => {
      if (!newSession?.user) {
        if (isActive()) {
          clearAuthState()
          if (!isAuthCallbackUrl()) {
            clearSupabaseAuthStorage()
          }
        }
        return true
      }

      const userId = newSession.user.id

      // Always set session immediately for auth hydration
      if (isActive()) {
        setSession(newSession)
        setUser(newSession.user)
      }

      // For initial load, try cache for instant role display
      if (isInitialLoad) {
        const localCache = getLocalAuthCache(userId)
        if (localCache && !localCache.isBlocked) {
          if (isActive()) {
            setIsAdmin(localCache.role === 'admin')
          }

          // Verify in background (don't block auth completion)
          verifyUserProfile(newSession, isActive)
            .then((profile) => {
              if (!profile || !isActive()) return

              if (profile.isBlocked) {
                // User was blocked - sign out
                clearAuthState()
                supabase.auth.signOut({ scope: 'local' }).catch(() => {
                  clearSupabaseAuthStorage()
                })
              } else {
                // Update cache and state if role changed
                setLocalAuthCache(userId, profile.role, false)
                setIsAdmin(profile.role === 'admin')
              }
            })
            .catch(() => {
              // Profile verification failed, but auth is still valid
              // Just continue with cached role
            })

          // Update login info in background
          updateLoginInfo(userId, newSession.access_token)
          return true
        }
      }

      // Start profile verification but don't block on it during init
      if (isInitialLoad) {
        // Fire and forget - don't block auth completion
        verifyUserProfile(newSession, isActive)
          .then((profile) => {
            if (!profile || !isActive()) return

            if (profile.isBlocked) {
              clearAuthState()
              supabase.auth.signOut({ scope: 'local' }).catch(() => {
                clearSupabaseAuthStorage()
              })
            } else {
              setLocalAuthCache(userId, profile.role, false)
              setIsAdmin(profile.role === 'admin')
              // Update login info in background
              updateLoginInfo(userId, newSession.access_token)
            }
          })
          .catch(() => {
            // Profile verification failed - user keeps basic auth but no admin role
            setIsAdmin(false)
          })
        return true
      }

      // For non-initial loads (like token refresh), verify profile synchronously
      try {
        const profile = await verifyUserProfile(newSession, isActive)

        if (!isActive()) {
          return false
        }

        if (!profile) {
          return false
        }

        if (profile.isBlocked) {
          clearAuthState()
          await supabase.auth.signOut({ scope: 'local' })
          return true
        }

        setLocalAuthCache(userId, profile.role, false)
        setIsAdmin(profile.role === 'admin')
        updateLoginInfo(userId, newSession.access_token)

        return true
      } catch {
        // Auth error during non-initial load
        return false
      }
    },
    [clearAuthState, verifyUserProfile]
  )

  const updateLoginInfo = async (userId: string, authToken?: string) => {
    // Prevent duplicate invalidation in StrictMode (effects run twice in dev)
    if (lastInvalidatedUserId.current !== userId) {
      hasInvalidatedOnLogin.current = false
      lastInvalidatedUserId.current = userId
    }
    if (hasInvalidatedOnLogin.current) return
    hasInvalidatedOnLogin.current = true

    // Single writer: edge function captures IP/location server-side, updates user_profiles.
    if (authToken) {
      void logLoginEvent(authToken)
      invalidateUserCache(userId, authToken)
    }
  }

  useEffect(() => {
    let isActive = true
    const checkIsActive = () => isActive
    let initResolved = false

    // Auth context is now mounting - clear any stale auth state
    hasInvalidatedOnLogin.current = false
    lastInvalidatedUserId.current = null

    // Check for expired tokens on mount and clear them properly
    // This ensures stale auth data doesn't cause API calls to hang
    const token = getSupabaseAuthTokenFromStorage()
    const hasExpiredToken = token?.access_token && isTokenExpired(token.access_token)
    const expiredTokenSignOutPromise = hasExpiredToken
      ? (async () => {
          clearAuthState()
          try {
            await supabase.auth.signOut({ scope: 'local' })
          } catch {
            // If signOut fails, manually clear storage as fallback
            clearSupabaseAuthStorage()
          }
        })()
      : Promise.resolve()

    // Timeout to prevent infinite loading state - show error to user
    const timeoutId = setTimeout(async () => {
      if (!isActive) return
      clearLocalAuthCache()
      // Use signOut to properly clear both storage AND in-memory Supabase client state
      // This prevents stale tokens from being used in subsequent API calls
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        // If signOut fails, manually clear storage
        clearSupabaseAuthStorage()
      }
      setSession(null)
      setUser(null)
      setIsAdmin(false)
      setAuthError('Authentication timed out. Please refresh and try again.')
      setLoading(false)
      isInitialized.current = true
      initResolved = true
      try {
        const reloadFlag = 'panda_auth_timeout_reloaded'
        const hasReloaded = sessionStorage.getItem(reloadFlag)
        if (!hasReloaded) {
          sessionStorage.setItem(reloadFlag, 'true')
          setTimeout(() => {
            if (isActive) {
              window.location.reload()
            }
          }, 100)
        }
      } catch {
        // sessionStorage not available; skip auto-reload
      }
    }, 5000)

    const finalizeInit = async (session: Session | null) => {
      if (!isActive || initResolved) return
      initResolved = true
      clearTimeout(timeoutId)

      try {
        // Handle session but don't let profile verification block loading
        const handled = await Promise.race([
          handleUserSession(session, checkIsActive, true),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000)),
        ])

        if (!handled && isActive) {
          // Session handling timed out - set basic auth state
          if (session?.user) {
            setSession(session)
            setUser(session.user)
            setIsAdmin(false) // Default to non-admin if profile check failed
          } else {
            setSession(null)
            setUser(null)
            setIsAdmin(false)
          }
        }
      } catch {
        // Any error during session handling
        if (isActive) {
          if (session?.user) {
            setSession(session)
            setUser(session.user)
            setIsAdmin(false)
          } else {
            setSession(null)
            setUser(null)
            setIsAdmin(false)
          }
        }
      }

      // ALWAYS end loading regardless of what happened above
      isInitialized.current = true
      if (isActive) setLoading(false)

      // Clear reload guard
      try {
        sessionStorage.removeItem('panda_auth_timeout_reloaded')
      } catch {
        // sessionStorage not available
      }
    }

    // Get initial session - only runs once on mount
    const initSession = async () => {
      try {
        await expiredTokenSignOutPromise
        const sessionPromise = supabase.auth.getSession().then(({ data }) => data.session)
        const timeoutPromise = new Promise<Session | null>((resolve) =>
          setTimeout(() => resolve(null), 1500)
        )
        const session = await Promise.race([sessionPromise, timeoutPromise])
        // Always finalize - even if session is null (user not logged in or timeout)
        await finalizeInit(session)
      } catch {
        // Auth initialization failed - don't log details to console
        // Still mark as initialized so future auth changes are processed
        if (isActive && !initResolved) {
          isInitialized.current = true
          setLoading(false)
        }
      }
    }

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isActive) return

      if (!isInitialized.current) {
        await finalizeInit(session)
        return
      }

      try {
        // Timeout wrapper to prevent infinite loading on hung RPC calls
        const handled = await Promise.race([
          handleUserSession(session, checkIsActive),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
        ])

        // Clean up OAuth hash from URL after successful sign-in
        if (session?.user) {
          cleanOAuthHash()
        }

        // If handling timed out and user had a session, force set state
        if (!handled && session?.user && isActive) {
          setSession(session)
          setUser(session.user)
        }
      } catch {
        // Auth state change error - silently continue
      }
    })

    initSession()

    return () => {
      isActive = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [clearAuthState, handleUserSession])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      // Clear state and cache immediately for responsive UI
      clearAuthState()

      await supabase.auth.signOut()
      // Ignore errors - state is already cleared locally
    } catch {
      // Sign out error - state is already cleared, user appears signed out
    } finally {
      clearSupabaseAuthStorage()
    }
  }, [clearAuthState])

  const contextValue = useMemo(
    () => ({
      user,
      session,
      loading,
      isAdmin,
      authError,
      signInWithGoogle,
      signOut,
      clearAuthError,
    }),
    [user, session, loading, isAdmin, authError, signInWithGoogle, signOut, clearAuthError]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
