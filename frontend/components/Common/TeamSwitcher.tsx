'use client'

import React, { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export interface TeamSwitcherProps {
    isOpen: boolean
    onClose: () => void
}

export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ isOpen, onClose }) => {
    const { team, allTeams, switchTeam, isLoading, user } = useAuthContext()
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSwitchTeam = async (teamId: string) => {
        try {
            setError(null)
            await switchTeam(teamId)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to switch team')
        }
    }

    const handleCreateTeam = () => {
        onClose()
        // Navigate to create team page - use relative path to app context
        router.push('/onboarding/create')
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                    <h2 className="text-lg font-semibold text-neutral-900">Chọn đội</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Team List */}
                <div className="overflow-y-auto flex-1 p-4">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {allTeams.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-neutral-500 text-sm">Bạn chưa có đội nào</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {allTeams.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleSwitchTeam(t.id)}
                                    disabled={isLoading || t.id === team?.id}
                                    className={`w-full px-4 py-3 rounded-lg text-left transition-all ${t.id === team?.id
                                            ? 'bg-blue-50 border-2 border-blue-500 text-blue-900'
                                            : 'bg-neutral-50 border border-neutral-200 text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200'
                                        } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{t.name}</p>
                                            <p className="text-xs text-neutral-500 capitalize">{t.role || 'member'}</p>
                                        </div>
                                        {t.id === team?.id && (
                                            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer: Create Team Button + Team Count */}
                <div className="border-t border-neutral-200 px-4 py-3 bg-neutral-50 space-y-3">
                    <button
                        onClick={handleCreateTeam}
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-lg bg-green-500 text-white font-medium text-sm transition-all hover:bg-green-600 active:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span>⚽</span> Tạo đội mới
                    </button>
                    <div className="text-center text-xs text-neutral-500">
                        {allTeams.length} đội {allTeams.length !== 1 ? 'đội' : ''}
                    </div>
                </div>
            </div>
        </>
    )
}

export default TeamSwitcher
