import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TemplatePicker from '@/components/TemplateLibrary/TemplatePicker'
import { useTemplateLibraryStore } from '@/stores/templateLibraryStore'

const TEMPLATES = [
  { id: 1, name: 'Event flyer', category: 'event-flyer', userId: null, projectId: null },
  { id: 10, name: 'ACME', category: 'corporate', userId: 1, projectId: null },
]

beforeEach(() => {
  useTemplateLibraryStore.setState({
    templates: TEMPLATES,
    isLoading: false,
    error: null,
    fetchTemplates: vi.fn(),
    applyTemplate: vi.fn(),
    saveAsTemplate: vi.fn(),
  })
})

describe('TemplatePicker', () => {
  it('lists templates with scope labels', () => {
    render(<TemplatePicker itemId="7" />)

    expect(screen.getByText('Event flyer')).toBeInTheDocument()
    expect(screen.getByText('ACME')).toBeInTheDocument()
    expect(screen.getByText(/preset/i)).toBeInTheDocument()
  })

  it('applies a template on click', () => {
    render(<TemplatePicker itemId="7" />)

    fireEvent.click(screen.getAllByTestId('apply-template-button')[1])

    expect(useTemplateLibraryStore.getState().applyTemplate).toHaveBeenCalledWith('7', 10)
  })

  it('saves the current design as a template with a name', () => {
    render(<TemplatePicker itemId="7" />)

    fireEvent.change(screen.getByTestId('template-name-input'), {
      target: { value: 'My Brand' },
    })
    fireEvent.click(screen.getByTestId('save-as-template-button'))

    expect(useTemplateLibraryStore.getState().saveAsTemplate).toHaveBeenCalledWith(
      '7',
      'My Brand',
      'user'
    )
  })

  it('disables save without a name', () => {
    render(<TemplatePicker itemId="7" />)

    expect(screen.getByTestId('save-as-template-button')).toBeDisabled()
  })
})
