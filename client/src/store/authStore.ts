import { create } from 'zustand'
import { authApi } from '../api/client'
import { connect, disconnect } from '../api/websocket'
import type { User } from '../types'
import { getApiErrorMessage } from '../types'

interface AuthResponse {
  user: User
  token: string
}

interface AvatarResponse {
  avatar_url: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  demoMode: boolean
  hasMapsKey: boolean

  initializeGuest: () => void
  logout: () => void
  loadUser: () => Promise<void>
  updateMapsKey: (key: string | null) => Promise<void>
  updateApiKeys: (keys: Record<string, string | null>) => Promise<void>
  updateProfile: (profileData: Partial<User>) => Promise<void>
  uploadAvatar: (file: File) => Promise<AvatarResponse>
  deleteAvatar: () => Promise<void>
  setDemoMode: (val: boolean) => void
  setHasMapsKey: (val: boolean) => void
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Create a guest user automatically
  const guestUser: User = {
    id: '1',
    username: 'Guest',
    email: 'guest@localhost',
    role: 'admin',
    avatar_url: null,
    created_at: new Date().toISOString(),
    maps_api_key: null,
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    demoMode: localStorage.getItem('demo_mode') === 'true',
    hasMapsKey: false,

    initializeGuest: () => {
      set({
        user: guestUser,
        token: 'guest-token',
        isAuthenticated: true,
        isLoading: false,
      })
      connect('guest-token')
    },

    logout: () => {
      disconnect()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null,
      })
    },

    loadUser: async () => {
      set({ isLoading: true })
      try {
        set({
          user: guestUser,
          isAuthenticated: true,
          isLoading: false,
        })
        connect('guest-token')
      } catch (err: unknown) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    },

    updateMapsKey: async (key: string | null) => {
      try {
        await authApi.updateMapsKey(key)
        set((state) => ({
          user: state.user ? { ...state.user, maps_api_key: key || null } : null,
        }))
      } catch (err: unknown) {
        throw new Error(getApiErrorMessage(err, 'Error saving API key'))
      }
    },

    updateApiKeys: async (keys: Record<string, string | null>) => {
      try {
        const data = await authApi.updateApiKeys(keys)
        set({ user: data.user })
      } catch (err: unknown) {
        throw new Error(getApiErrorMessage(err, 'Error saving API keys'))
      }
    },

    updateProfile: async (profileData: Partial<User>) => {
      try {
        const data = await authApi.updateSettings(profileData)
        set({ user: data.user })
      } catch (err: unknown) {
        throw new Error(getApiErrorMessage(err, 'Error updating profile'))
      }
    },

    uploadAvatar: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const data = await authApi.uploadAvatar(formData)
      set((state) => ({ user: state.user ? { ...state.user, avatar_url: data.avatar_url } : null }))
      return data
    },

    deleteAvatar: async () => {
      await authApi.deleteAvatar()
      set((state) => ({ user: state.user ? { ...state.user, avatar_url: null } : null }))
    },

    setDemoMode: (val: boolean) => {
      if (val) localStorage.setItem('demo_mode', 'true')
      else localStorage.removeItem('demo_mode')
      set({ demoMode: val })
    },

    setHasMapsKey: (val: boolean) => set({ hasMapsKey: val }),
  }
})
