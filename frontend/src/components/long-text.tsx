import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type LongTextProps = {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  lines?: 1 | 2
}

export function LongText({
  children,
  className = '',
  contentClassName = '',
  lines = 1,
}: LongTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [isOverflown, setIsOverflown] = useState(false)

  // Use ref callback to check overflow when element is mounted
  const refCallback = (node: HTMLSpanElement | null) => {
    ref.current = node
    if (node && checkOverflow(node)) {
      queueMicrotask(() => setIsOverflown(true))
    }
  }
  const truncationClassName = lines === 2 ? 'line-clamp-2' : 'truncate'

  if (!isOverflown)
    return (
      <span
        ref={refCallback}
        className={cn('block', truncationClassName, className)}
      >
        {children}
      </span>
    )

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            ref={refCallback}
            tabIndex={0}
            className={cn(
              'block rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring',
              truncationClassName,
              className
            )}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className={contentClassName}>{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const checkOverflow = (textContainer: HTMLElement | null) => {
  if (textContainer) {
    return (
      textContainer.offsetHeight < textContainer.scrollHeight ||
      textContainer.offsetWidth < textContainer.scrollWidth
    )
  }
  return false
}
