import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getTodayCheckIn, getCheckInHistory, getChatHistory, getTriage, getExperts, getMyCasesWellness, getCases, getFollowUps, getTimeline, getResources, getUsers, apiMessage } from '../../api'
import { activeCase, records } from './dashboardModel'

// Each section owns its request state. An optional request never blanks the page.
export function useDashboardSection(load, enabled = true) {
  const [version, setVersion] = useState(0)
  const [state, setState] = useState({ data: null, loading: enabled, error: '' })
  useEffect(() => {
    let current = true
    if (!enabled) { setState({ data: null, loading: false, error: '' }); return }
    setState(s => ({ ...s, loading: true, error: '' }))
    Promise.resolve().then(load).then(data => { if (current) setState({ data, loading: false, error: '' }) })
      .catch(error => { if (current) setState(s => ({ ...s, loading: false, error: apiMessage(error) })) })
    return () => { current = false }
  }, [load, enabled, version])
  const retry = useCallback(() => setVersion(v => v + 1), [])
  return { ...state, retry }
}

const loadExperts = () => getExperts(3)

export default function useDashboardData() {
  const { user } = useAuth()
  const today = useDashboardSection(getTodayCheckIn)
  const checkIns = useDashboardSection(getCheckInHistory)
  const chat = useDashboardSection(getChatHistory)
  const triage = useDashboardSection(getTriage)
  const experts = useDashboardSection(loadExperts)
  const users = useDashboardSection(() => getUsers())
  const wellness = useDashboardSection(getMyCasesWellness)
  const cases = useDashboardSection(getCases)
  const resources = useDashboardSection(getResources)

  // Profile data - derive from users list filtered by current user id
  const profileData = useMemo(() => {
    if (!users.data) return users.data
    const allUsers = Array.isArray(users.data) ? users.data : []
    const me = allUsers.find(u => u.id === user?.id)
    return me || users.data
  }, [users.data, user?.id])

  // Profile object with same shape as before for backward compatibility
  const profile = useMemo(() => ({
    ...users,
    data: profileData,
  }), [users, profileData])

  const selected = activeCase(cases.data)
  const number = selected?.caseNumber
  const loadFollowUps = useCallback(() => getFollowUps(number), [number])
  const loadTimeline = useCallback(() => getTimeline(number), [number])
  const followUps = useDashboardSection(loadFollowUps, !!number)
  const timeline = useDashboardSection(loadTimeline, !!number)
  return { today, checkIns, chat, triage, experts, profile, wellness, cases, resources, followUps, timeline }
}
