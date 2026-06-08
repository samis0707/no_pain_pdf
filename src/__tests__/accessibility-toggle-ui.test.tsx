import { describe, it, expect, beforeEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useExportStore } from '@/stores/exportStore'
import { useTemplateStore } from '@/stores/templateStore'
import ExportPanel from '@/components/ExportPanel/ExportPanel'

beforeEach(() => {
  useTemplateStore.setState({ html: '<p>test</p>', css: '' })
  useExportStore.setState({ enableAccessibility: false, isExporting: false, error: null })
})

describe('ExportPanel accessibility toggle', () => {
  it('renders a checkbox with label containing PDF/UA or accessibility', () => {
    render(<ExportPanel />)

    const checkbox = screen.getByRole('checkbox', { name: /pdf\/ua|accessibility/i })
    expect(checkbox).toBeInTheDocument()
  })

  it('clicking the checkbox calls setEnableAccessibility with the new value', async () => {
    const user = userEvent.setup()
    render(<ExportPanel />)

    const checkbox = screen.getByRole('checkbox', { name: /pdf\/ua|accessibility/i })
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    expect(useExportStore.getState().enableAccessibility).toBe(true)

    await user.click(checkbox)
    expect(useExportStore.getState().enableAccessibility).toBe(false)
  })

  it('checkbox checked state reflects the store value', () => {
    useExportStore.setState({ enableAccessibility: true })
    render(<ExportPanel />)

    const checkbox = screen.getByRole('checkbox', { name: /pdf\/ua|accessibility/i })
    expect(checkbox).toBeChecked()

    useExportStore.setState({ enableAccessibility: false })
    cleanup()
    render(<ExportPanel />)

    const checkboxAfter = screen.getByRole('checkbox', { name: /pdf\/ua|accessibility/i })
    expect(checkboxAfter).not.toBeChecked()
  })
})
