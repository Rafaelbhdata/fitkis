import { render, screen, fireEvent } from '@testing-library/react'
import { ProgressionBanner } from '@/components/gym'

describe('ProgressionBanner', () => {
  const defaultProps = {
    suggestion: {
      exerciseId: 'bench_press',
      suggestedLbs: 105,
      reason: 'Completaste todas las reps las últimas 2 sesiones',
    },
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders progression header', () => {
    render(<ProgressionBanner {...defaultProps} />)
    expect(screen.getByText('¡Hora de subir peso!')).toBeInTheDocument()
  })

  it('displays suggested weight', () => {
    render(<ProgressionBanner {...defaultProps} />)
    expect(screen.getByText(/Nuevo peso sugerido:/)).toBeInTheDocument()
    expect(screen.getByText(/105 lbs/)).toBeInTheDocument()
  })

  it('displays reason text', () => {
    render(<ProgressionBanner {...defaultProps} />)
    expect(screen.getByText('Completaste todas las reps las últimas 2 sesiones')).toBeInTheDocument()
  })

  it('calls onAccept when accept button is clicked', () => {
    render(<ProgressionBanner {...defaultProps} />)
    const acceptButton = screen.getByText('Aplicar')
    fireEvent.click(acceptButton)
    expect(defaultProps.onAccept).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<ProgressionBanner {...defaultProps} />)
    const dismissButton = screen.getByText('Ahora no')
    fireEvent.click(dismissButton)
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders with different weight values', () => {
    render(
      <ProgressionBanner
        {...defaultProps}
        suggestion={{ ...defaultProps.suggestion, suggestedLbs: 50 }}
      />
    )
    expect(screen.getByText(/50 lbs/)).toBeInTheDocument()
  })

  it('has proper styling classes', () => {
    const { container } = render(<ProgressionBanner {...defaultProps} />)
    const banner = container.firstChild as HTMLElement
    expect(banner).toHaveClass('rounded-xl')
    expect(banner).toHaveClass('bg-accent/10')
  })
})
