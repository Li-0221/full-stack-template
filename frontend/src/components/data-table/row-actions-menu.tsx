import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Ellipsis } from '@/components/icons'

const HOVER_CLOSE_DELAY_MS = 120

interface DataTableRowActionsMenuProps {
  label: string
  contentClassName?: string
  children: ReactNode
}

export function DataTableRowActionsMenu({
  label,
  contentClassName,
  children,
}: DataTableRowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openedByHoverRef = useRef(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  function cancelClose() {
    if (closeTimerRef.current === null) return
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }

  function openFromHover(pointerType: string) {
    if (pointerType !== 'mouse') return
    cancelClose()
    if (!open)
      previousFocusRef.current = document.activeElement as HTMLElement | null
    openedByHoverRef.current = true
    setOpen(true)
  }

  function closeAfterHover(pointerType: string) {
    if (pointerType !== 'mouse') return
    cancelClose()
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    },
    []
  )

  useEffect(() => {
    if (!open || !openedByHoverRef.current || !previousFocusRef.current) return

    const frame = requestAnimationFrame(() => {
      previousFocusRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        cancelClose()
        if (nextOpen) openedByHoverRef.current = false
        setOpen(nextOpen)
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-8 data-[state=open]:bg-muted'
          aria-label={label}
          title={label}
          onPointerEnter={(event) => openFromHover(event.pointerType)}
          onPointerLeave={(event) => closeAfterHover(event.pointerType)}
          onPointerDown={(event) => {
            if (
              event.pointerType === 'mouse' &&
              openedByHoverRef.current &&
              open
            ) {
              event.preventDefault()
            }
          }}
        >
          <Ellipsis aria-hidden='true' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className={contentClassName}
        onPointerEnter={(event) => openFromHover(event.pointerType)}
        onPointerLeave={(event) => closeAfterHover(event.pointerType)}
        onFocusOutside={(event) => {
          if (openedByHoverRef.current) event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          if (openedByHoverRef.current) event.preventDefault()
        }}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
