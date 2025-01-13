import { render, screen } from '@testing-library/react'
import React from 'react'
import DeviceControls from '../../../src/components/device/DeviceControls'
import { GlobalAppContext } from '../../../src/context/globalAppContextDef'
import { GCSState } from '../../../src/context/globalAppTypes'
import { describe, expect, it, vi } from 'vitest'

describe('DeviceControls component', () => {
  const defaultContext = {
    gcsState: GCSState.RADIO_CONFIG_INPUT,
    radioConfig: {
      interface_type: 'serial',
      serialPorts: ['COM1', 'COM2'],
      selectedPort: '',
      baudRate: 115200,
      host: '',
      tcpPort: 50000,
      ackTimeout: 2000,
      maxRetries: 3
    },
    pingFinderConfig: {
      targetFrequencies: [],
      autoCenter: true
    },
    loadSerialPorts: vi.fn(),
    sendRadioConfig: vi.fn(),
    cancelRadioConfig: vi.fn()
  } as any

  it('renders DroneStatus always', () => {
    render(
      <GlobalAppContext.Provider value={defaultContext}>
        <DeviceControls />
      </GlobalAppContext.Provider>
    )

    expect(screen.getByText('Drone Status')).toBeInTheDocument()
  })

  it('shows RadioConfig if in RADIO_CONFIG_INPUT state', () => {
    render(
      <GlobalAppContext.Provider value={defaultContext}>
        <DeviceControls />
      </GlobalAppContext.Provider>
    )

    expect(screen.getByText('Radio Configuration')).toBeInTheDocument()
  })

  it('shows PingFinderConfig if in PING_FINDER_CONFIG_INPUT state', () => {
    render(
      <GlobalAppContext.Provider value={{
        ...defaultContext,
        gcsState: GCSState.PING_FINDER_CONFIG_INPUT
      }}>
        <DeviceControls />
      </GlobalAppContext.Provider>
    )

    expect(screen.getByText('Ping Finder Configuration')).toBeInTheDocument()
  })
})
