import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HelperPanel from '@/components/Chat/HelperPanel'
import { useTemplateStore } from '@/stores/templateStore'
import { usePreviewStore } from '@/stores/previewStore'
import { helperManager } from '@/lib/ai/helper-manager'

beforeEach(() => {
  useTemplateStore.setState({
    miscText: '',
    html: '',
    css: '',
    name: '',
    itemId: null,
    isSaving: false,
    lastSaved: null,
    error: null,
    version: 0,
  })
  usePreviewStore.setState({ isCompiling: false, compileError: null, compiledBody: '' })
  helperManager.clear()
})

describe('HelperPanel', () => {
  it('shows empty state when no helpers are registered', () => {
    render(<HelperPanel />)
    expect(screen.getByText(/No custom helpers registered/)).toBeInTheDocument()
  })

  it('displays helpers parsed from templateStore miscText', () => {
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'greet', params: ['name'], body: 'return `Hello ${name}`' },
        ],
      }),
    })
    render(<HelperPanel />)
    expect(screen.getByText('greet')).toBeInTheDocument()
    expect(screen.getByText(/return `Hello/)).toBeInTheDocument()
  })

  it('shows params for each helper', () => {
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'add', params: ['a', 'b'], body: 'return a + b' },
        ],
      }),
    })
    render(<HelperPanel />)
    expect(screen.getByText(/a,\s*b/)).toBeInTheDocument()
  })

  it('deletes a helper when delete button is clicked', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'greet', params: ['name'], body: 'return `Hello ${name}`' },
          { name: 'double', params: ['n'], body: 'return n * 2' },
        ],
      }),
    })
    render(<HelperPanel />)
    expect(screen.getByText('greet')).toBeInTheDocument()
    expect(screen.getByText('double')).toBeInTheDocument()

    const deleteBtn = screen.getByTestId('delete-helper-greet')
    await user.click(deleteBtn)

    expect(screen.queryByText('greet')).not.toBeInTheDocument()
    expect(screen.getByText('double')).toBeInTheDocument()
  })

  it('edits a helper name inline', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'oldName', params: [], body: 'return 42' },
        ],
      }),
    })
    render(<HelperPanel />)

    const editBtn = screen.getByTestId('edit-helper-oldName')
    await user.click(editBtn)

    const nameInput = screen.getByTestId('edit-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'newName')

    const saveBtn = screen.getByTestId('save-helper-btn')
    await user.click(saveBtn)

    expect(screen.getByText('newName')).toBeInTheDocument()
    expect(screen.queryByText('oldName')).not.toBeInTheDocument()
  })

  it('edits a helper body inline', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'f', params: ['x'], body: 'return x' },
        ],
      }),
    })
    render(<HelperPanel />)

    const editBtn = screen.getByTestId('edit-helper-f')
    await user.click(editBtn)

    const bodyInput = screen.getByTestId('edit-body-input')
    await user.clear(bodyInput)
    await user.type(bodyInput, 'return x * 2')

    const saveBtn = screen.getByTestId('save-helper-btn')
    await user.click(saveBtn)

    expect(screen.getByText(/return x \* 2/)).toBeInTheDocument()
  })

  it('cancels editing and restores original values', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'keep', params: [], body: 'return 1' },
        ],
      }),
    })
    render(<HelperPanel />)

    const editBtn = screen.getByTestId('edit-helper-keep')
    await user.click(editBtn)

    const nameInput = screen.getByTestId('edit-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'changed')

    const cancelBtn = screen.getByTestId('cancel-edit-btn')
    await user.click(cancelBtn)

    expect(screen.getByText('keep')).toBeInTheDocument()
    expect(screen.queryByText('changed')).not.toBeInTheDocument()
  })

  it('persists changes to templateStore after delete', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'removeMe', params: [], body: 'return 0' },
        ],
      }),
    })
    render(<HelperPanel />)

    await user.click(screen.getByTestId('delete-helper-removeMe'))

    const { miscText } = useTemplateStore.getState()
    const parsed = JSON.parse(miscText)
    expect(parsed.customHelpers).toHaveLength(0)
  })

  it('persists changes to templateStore after edit', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'x', params: [], body: 'return 1' },
        ],
      }),
    })
    render(<HelperPanel />)

    await user.click(screen.getByTestId('edit-helper-x'))
    const nameInput = screen.getByTestId('edit-name-input')
    await user.clear(nameInput)
    await user.type(nameInput, 'y')
    await user.click(screen.getByTestId('save-helper-btn'))

    const { miscText } = useTemplateStore.getState()
    const parsed = JSON.parse(miscText)
    expect(parsed.customHelpers).toHaveLength(1)
    expect(parsed.customHelpers[0].name).toBe('y')
  })

  it('triggers preview recompilation after delete', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'h', params: [], body: 'return 1' },
        ],
      }),
    })
    render(<HelperPanel />)

    usePreviewStore.setState({ isCompiling: false })
    await user.click(screen.getByTestId('delete-helper-h'))

    expect(usePreviewStore.getState().isCompiling).toBe(true)
  })

  it('triggers preview recompilation after edit', async () => {
    const user = userEvent.setup()
    useTemplateStore.setState({
      miscText: JSON.stringify({
        customHelpers: [
          { name: 'h', params: [], body: 'return 1' },
        ],
      }),
    })
    render(<HelperPanel />)

    usePreviewStore.setState({ isCompiling: false })
    await user.click(screen.getByTestId('edit-helper-h'))
    await user.click(screen.getByTestId('save-helper-btn'))

    expect(usePreviewStore.getState().isCompiling).toBe(true)
  })
})
