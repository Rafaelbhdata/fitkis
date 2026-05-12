import { render, screen, fireEvent } from '@testing-library/react'
import { SetRow } from '@/components/gym'

describe('SetRow', () => {
  const defaultProps = {
    index: 0,
    lbs: '100',
    reps: '10',
    completed: false,
    targetReps: 12,
    onLbsChange: jest.fn(),
    onRepsChange: jest.fn(),
    onToggleComplete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders set number correctly (1-indexed)', () => {
    render(<SetRow {...defaultProps} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders second set number correctly', () => {
    render(<SetRow {...defaultProps} index={1} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('displays lbs value in input', () => {
    render(<SetRow {...defaultProps} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toHaveValue(100)
  })

  it('displays reps value in input', () => {
    render(<SetRow {...defaultProps} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[1]).toHaveValue(10)
  })

  it('calls onLbsChange when lbs input changes', () => {
    render(<SetRow {...defaultProps} />)
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '105' } })
    expect(defaultProps.onLbsChange).toHaveBeenCalledWith('105')
  })

  it('calls onRepsChange when reps input changes', () => {
    render(<SetRow {...defaultProps} />)
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[1], { target: { value: '12' } })
    expect(defaultProps.onRepsChange).toHaveBeenCalledWith('12')
  })

  it('calls onToggleComplete when complete button is clicked', () => {
    render(<SetRow {...defaultProps} />)
    const completeButton = screen.getByRole('button')
    fireEvent.click(completeButton)
    expect(defaultProps.onToggleComplete).toHaveBeenCalledTimes(1)
  })

  it('shows completed state with accent background', () => {
    render(<SetRow {...defaultProps} completed={true} />)
    const completeButton = screen.getByRole('button')
    expect(completeButton).toHaveClass('bg-accent')
  })

  it('shows uncompleted state with accent/10 background', () => {
    render(<SetRow {...defaultProps} completed={false} />)
    const completeButton = screen.getByRole('button')
    expect(completeButton).toHaveClass('bg-accent/10')
  })

  it('disables inputs when disabled prop is true', () => {
    render(<SetRow {...defaultProps} disabled={true} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toBeDisabled()
    expect(inputs[1]).toBeDisabled()
  })

  it('disables button when disabled prop is true', () => {
    render(<SetRow {...defaultProps} disabled={true} />)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('uses targetReps as placeholder for reps input', () => {
    render(<SetRow {...defaultProps} targetReps={15} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[1]).toHaveAttribute('placeholder', '15')
  })
})
