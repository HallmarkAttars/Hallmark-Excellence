// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App Root Component', () => {
  it('renders App without crashing', async () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
