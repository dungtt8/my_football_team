'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
    id: string
    email: string
    name: string
    avatar?: string
}

export interface Team {
    id: string
    name: string
    logo?: string
}

export type UserRole = 'member' | 'co_manager' | 'manager' | 'owner'

export interface AuthContextType {
    user: User | null
    team: Team | null
    role: UserRole | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => void
    setAuthToken: (token: string) => void
    setAuthData: (token: string, user: User, team: Team | null, role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [team, setTeam] = useState<Team | null>(null)
    const [role, setRole] = useState<UserRole | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize auth from localStorage on mount
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('auth_token')
                const storedUser = localStorage.getItem('user')
                const storedTeam = localStorage.getItem('team')
                const storedRole = localStorage.getItem('role')

                if (token && storedUser && storedRole) {
                    setUser(JSON.parse(storedUser))
                    if (storedTeam) setTeam(JSON.parse(storedTeam))
                    setRole(storedRole as UserRole)
                }
            } catch (error) {
                console.error('Failed to initialize auth:', error)
                localStorage.removeItem('auth_token')
                localStorage.removeItem('user')
                localStorage.removeItem('team')
                localStorage.removeItem('role')
            } finally {
                setIsLoading(false)
            }
        }

        initializeAuth()
    }, [])

    const login = async (email: string, password: string) => {
        setIsLoading(true)
        try {
            // TODO: Replace with actual API call
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Login failed')
            }

            localStorage.setItem('auth_token', data.token)
            localStorage.setItem('user', JSON.stringify(data.user))
            localStorage.setItem('team', JSON.stringify(data.team))
            localStorage.setItem('role', data.user.role)

            setUser(data.user)
            setTeam(data.team)
            setRole(data.user.role)
        } catch (error) {
            console.error('Login error:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        localStorage.removeItem('team')
        localStorage.removeItem('role')

        setUser(null)
        setTeam(null)
        setRole(null)
    }

    const setAuthToken = (token: string) => {
        localStorage.setItem('auth_token', token)
    }

    const setAuthData = (token: string, userData: User, teamData: Team | null, userRole: UserRole) => {
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        if (teamData) {
            localStorage.setItem('team', JSON.stringify(teamData))
        } else {
            localStorage.removeItem('team')
        }
        localStorage.setItem('role', userRole)
        setUser(userData)
        setTeam(teamData)
        setRole(userRole)
    }

    const value: AuthContextType = {
        user,
        team,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setAuthToken,
        setAuthData,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuthContext must be used within AuthProvider')
    }
    return context
}
