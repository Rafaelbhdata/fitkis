import { render, screen, fireEvent } from '@testing-library/react'
import { RestTimer } from '@/components/gym'

describe('RestTimer', () => {
  const defaultProps = {
    restSeconds: 90,
    restPreset: 90,
    isPaused: false,
    onReset: jest.fn(),
    onTogglePause: jest.fn(),
    onSkip: jest.fn(),
    onPresetSelect: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders timer display with correct time', () => {
    render(<RestTimer {...defaultProps} />)
    // The timer display is inside the tabular-nums span
    const timerDisplay = document.querySelector('.tabular-nums')
    expect(timerDisplay?.textContent).toBe('1:30')
  })

  it('formats seconds-only time correctly', () => {
    render(<RestTimer {...defaultProps} restSeconds={45} />)
    const timerDisplay = document.querySelector('.tabular-nums')
    expect(timerDisplay?.textContent).toBe('0:45')
  })

  it('formats minutes correctly', () => {
    render(<RestTimer {...defaultProps} restSeconds={120} />)
    const timerDisplay = document.querySelector('.tabular-nums')
    expect(timerDisplay?.textContent).toBe('2:00')
  })

  it('calls onReset when reset button is clicked', () => {
    render(<RestTimer {...defaultProps} />)
    const resetButton = screen.getByLabelText('Reiniciar timer')
    fireEvent.click(resetButton)
    expect(defaultProps.onReset).toHaveBeenCalledTimes(1)
  })

  it('calls onTogglePause when pause button is clicked', () => {
    render(<RestTimer {...defaultProps} />)
    const pauseButton = screen.getByLabelText('Pausar')
    fireEvent.click(pauseButton)
    expect(defaultProps.onTogglePause).toHaveBeenCalledTimes(1)
  })

  it('shows continue button when paused', () => {
    render(<RestTimer {...defaultProps} isPaused={true} />)
    expect(screen.getByLabelText('Continuar')).toBeInTheDocument()
  })

  it('calls onSkip when skip button is clicked', () => {
    render(<RestTimer {...defaultProps} />)
    const skipButton = screen.getByLabelText('Saltar descanso')
    fireEvent.click(skipButton)
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1)
  })

  it('calls onSkip when overlay is clicked', () => {
    render(<RestTimer {...defaultProps} />)
    const overlay = document.querySelector('.overlay')
    if (overlay) fireEvent.click(overlay)
    expect(defaultProps.onSkip).toHaveBeenCalledTimes(1)
  })

  it('renders all four preset options', () => {
    render(<RestTimer {...defaultProps} />)
    expect(screen.getByText('1:00')).toBeInTheDocument()
    // Note: 1:30 appears twice (timer + button) when restSeconds=90, so check 2:00 and 3:00
    expect(screen.getByText('2:00')).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()
  })

  it('calls onPresetSelect when preset button is clicked', () => {
    render(<RestTimer {...defaultProps} />)
    const preset60 = screen.getByText('1:00')
    fireEvent.click(preset60)
    expect(defaultProps.onPresetSelect).toHaveBeenCalledWith(60)
  })

  it('shows "Tiempo de descanso" label', () => {
    render(<RestTimer {...defaultProps} />)
    expect(screen.getByText('Tiempo de descanso')).toBeInTheDocument()
  })

  it('highlights active preset with accent styling', () => {
    render(<RestTimer {...defaultProps} restPreset={90} />)
    // The 1:30 button should have the accent class when preset is 90
    const buttons = screen.getAllByText('1:30')
    // Find the button (not the timer display)
    const presetButton = buttons.find(el => el.tagName === 'BUTTON')
    expect(presetButton).toHaveClass('bg-accent/20')
  })
})
