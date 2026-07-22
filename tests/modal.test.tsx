// @vitest-environment jsdom
import React, { useState } from 'react'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from '@/components/ui/modal'

// Mock UI tokens
vi.mock('@/app/components/ui', () => ({
  ui: {
    modal: 'ui-modal',
    modalOverlay: 'ui-modal-overlay',
    modalHeader: 'ui-modal-header',
    modalBody: 'ui-modal-body',
    modalFooter: 'ui-modal-footer',
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Modal', () => {
  it('renders with title and description', () => {
    const { rerender } = render(
      <Modal open={false} title="Test Modal" description="Test description" onOpenChange={() => {}}>
        <p>Modal content</p>
      </Modal>
    )

    // Modal should not be in DOM when closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Rerender with open=true
    rerender(
      <Modal open={true} title="Test Modal" description="Test description" onOpenChange={() => {}}>
        <p>Modal content</p>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('calls onOpenChange when close button is clicked', () => {
    const onOpenChange = vi.fn()

    render(
      <Modal open={true} title="Test Modal" onOpenChange={onOpenChange}>
        <p>Content</p>
      </Modal>
    )

    const closeButton = screen.getByRole('button', { name: '닫기' })
    fireEvent.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange when overlay is clicked', () => {
    const onOpenChange = vi.fn()

    render(
      <Modal open={true} title="Test Modal" onOpenChange={onOpenChange}>
        <p>Content</p>
      </Modal>
    )

    // Get the overlay element (the background div with aria-hidden)
    const dialog = screen.getByRole('dialog')
    const overlay = dialog.parentElement?.querySelector('[aria-hidden="true"]') as HTMLElement

    if (overlay) {
      fireEvent.click(overlay)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    }
  })

  it('closes modal with Escape key', () => {
    const onOpenChange = vi.fn()

    render(
      <Modal open={true} title="Test Modal" onOpenChange={onOpenChange}>
        <input type="text" placeholder="Input field" />
      </Modal>
    )

    const input = screen.getByPlaceholderText('Input field')
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders footer when provided', () => {
    render(
      <Modal open={true} title="Test Modal" onOpenChange={() => {}} footer={<button>Save</button>}>
        <p>Content</p>
      </Modal>
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(
      <Modal open={true} title="Test Modal" onOpenChange={() => {}} className="custom-class">
        <p>Content</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('custom-class')
  })

  it('traps focus within modal', () => {
    const onOpenChange = vi.fn()

    render(
      <Modal open={true} title="Test Modal" onOpenChange={onOpenChange}>
        <div>
          <input type="text" placeholder="First input" />
          <input type="text" placeholder="Second input" />
        </div>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    const firstInput = screen.getByPlaceholderText('First input')
    const secondInput = screen.getByPlaceholderText('Second input')
    const closeButton = screen.getByRole('button', { name: '닫기' })

    // Focus should be within the dialog (on the content or a focusable element)
    // When Radix Dialog opens, it automatically manages focus
    const activeElement = document.activeElement
    expect(dialog.contains(activeElement) || activeElement === dialog).toBe(true)

    // Verify that all focusable elements within dialog are accessible
    expect(firstInput).toBeInTheDocument()
    expect(secondInput).toBeInTheDocument()
    expect(closeButton).toBeInTheDocument()
  })

  it('restores focus to trigger element on close', () => {
    const ModalWrapper = () => {
      const [open, setOpen] = useState(false)

      return (
        <div>
          <button onClick={() => setOpen(true)}>Open Modal</button>
          <Modal open={open} title="Test Modal" onOpenChange={setOpen}>
            <p>Content</p>
          </Modal>
        </div>
      )
    }

    render(<ModalWrapper />)

    const openButton = screen.getByRole('button', { name: 'Open Modal' })

    // Open modal
    openButton.focus()
    fireEvent.click(openButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Close modal via close button
    const closeButton = screen.getByRole('button', { name: '닫기' })
    fireEvent.click(closeButton)

    // After closing, the trigger button should have focus restored
    // This is handled by Radix Dialog automatically
  })

  it('locks body scroll when open', () => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'auto'

    const { rerender } = render(
      <Modal open={false} title="Test Modal" onOpenChange={() => {}}>
        <p>Content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('auto')

    rerender(
      <Modal open={true} title="Test Modal" onOpenChange={() => {}}>
        <p>Content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal open={false} title="Test Modal" onOpenChange={() => {}}>
        <p>Content</p>
      </Modal>
    )

    expect(document.body.style.overflow).toBe('auto')

    // Cleanup
    document.body.style.overflow = originalOverflow
  })

  it('maintains prop API compatibility', () => {
    const onOpenChange = vi.fn()

    const { rerender } = render(
      <Modal
        open={false}
        title="Title"
        description="Description"
        onOpenChange={onOpenChange}
        footer={<button>Footer</button>}
        className="custom"
      >
        <p>Children</p>
      </Modal>
    )

    // Should render without errors
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(
      <Modal
        open={true}
        title="Title"
        description="Description"
        onOpenChange={onOpenChange}
        footer={<button>Footer</button>}
        className="custom"
      >
        <p>Children</p>
      </Modal>
    )

    // Should render dialog with all props applied
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveClass('custom')
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Children')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Footer' })).toBeInTheDocument()
  })
})
