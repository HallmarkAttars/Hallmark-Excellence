// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AnnouncementBar from './AnnouncementBar'
import { ANNOUNCEMENTS } from '../../data/content'

describe('AnnouncementBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('renders the first announcement as a link to its page', () => {
    render(
      <MemoryRouter>
        <AnnouncementBar />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', {
      name: new RegExp(ANNOUNCEMENTS[0].label, 'i'),
    })
    expect(link.getAttribute('href')).toBe(ANNOUNCEMENTS[0].to)
  })

  it('rotates to the next announcement every 4 seconds', () => {
    render(
      <MemoryRouter>
        <AnnouncementBar />
      </MemoryRouter>
    )

    expect(screen.getByText(new RegExp(ANNOUNCEMENTS[0].label, 'i'))).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByText(new RegExp(ANNOUNCEMENTS[1].label, 'i'))).toBeTruthy()
  })

  it('pauses rotation while hovered and resumes on leave', () => {
    const { container } = render(
      <MemoryRouter>
        <AnnouncementBar />
      </MemoryRouter>
    )

    const bar = container.querySelector('.announcement-bar')
    fireEvent.mouseEnter(bar)

    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(screen.getByText(new RegExp(ANNOUNCEMENTS[0].label, 'i'))).toBeTruthy()

    fireEvent.mouseLeave(bar)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByText(new RegExp(ANNOUNCEMENTS[1].label, 'i'))).toBeTruthy()
  })
})
