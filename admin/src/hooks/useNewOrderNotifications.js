import { useEffect, useRef, useState } from 'react'
import { getOrders } from '../services/mockApi'
import {
  STORAGE_KEY,
  loadState,
  saveState,
  initState,
  detectNewOrders,
  markAllRead,
  markRead,
  notificationsFor,
} from '../utils/orderNotifications'

// The admin app is a REST client (no websockets / realtime listeners), so the
// smallest appropriate realtime mechanism is a gentle poll of the EXISTING
// /api/admin/orders endpoint, plus an immediate refresh when the tab regains
// focus. No new infrastructure, no duplicate order system.
const POLL_MS = 30000

export default function useNewOrderNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const stateRef = useRef(null)

  const apply = (state) => {
    stateRef.current = state
    saveState(state)
    setUnreadCount(state.unread.length)
    setNotifications(notificationsFor(state))
  }

  const refresh = async () => {
    try {
      const orders = await getOrders()
      let state = stateRef.current || loadState()
      if (!state) {
        // First run — seed every existing order as seen so the feature launch
        // never notifies the admin about old orders.
        state = initState(orders)
      } else {
        state = detectNewOrders(orders, state).state
      }
      apply(state)
    } catch {
      // Transient failure (cold start / network blip) — keep the current
      // state; the next poll retries. A genuinely dead session is handled by
      // api.js (401 → logout), so we never retry an invalid token forever.
    }
  }

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, POLL_MS)
    const onFocus = () => refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    // Keep multiple open admin tabs in sync — every tab persists the same
    // seen-set, so no tab can ever double-notify the same order.
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const state = loadState()
        if (state) apply(state)
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('storage', onStorage)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const handleMarkAllRead = () => {
    const state = stateRef.current
    if (state && state.unread.length > 0) apply(markAllRead(state))
  }

  const handleMarkRead = (id) => {
    const state = stateRef.current
    if (state) apply(markRead(state, id))
  }

  return { unreadCount, notifications, markAllRead: handleMarkAllRead, markRead: handleMarkRead }
}
