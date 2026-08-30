import * as React from "react"
import { cn } from "@/lib/utils"

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: number
}

const TimelineContext = React.createContext<{ defaultValue?: number }>({})

export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, defaultValue, children, ...props }, ref) => {
    return (
      <TimelineContext.Provider value={{ defaultValue }}>
        <div
          ref={ref}
          className={cn(
            "group/timeline flex flex-col data-[orientation=vertical]:flex-col data-[orientation=vertical]:relative",
            className
          )}
          data-orientation="vertical"
          {...props}
        >
          {children}
        </div>
      </TimelineContext.Provider>
    )
  }
)
Timeline.displayName = "Timeline"

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number
  isCompleted?: boolean
}

export const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, step, isCompleted, children, ...props }, ref) => {
    const { defaultValue } = React.useContext(TimelineContext)
    const finalCompleted = isCompleted !== undefined ? isCompleted : (defaultValue !== undefined && step <= defaultValue)

    return (
      <div
        ref={ref}
        className={cn(
          "group-data-[orientation=vertical]/timeline:relative group-data-[orientation=vertical]/timeline:pb-8 last:pb-0 flex flex-col",
          className
        )}
        data-completed={finalCompleted ? "true" : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TimelineItem.displayName = "TimelineItem"

export const TimelineHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 relative w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TimelineHeader.displayName = "TimelineHeader"

export const TimelineSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-3 top-6 bottom-0 w-[2px] bg-gray-200 group-data-completed/timeline-item:bg-blue-600 transition-colors duration-300",
        className
      )}
      {...props}
    />
  )
})
TimelineSeparator.displayName = "TimelineSeparator"

export const TimelineIndicator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-0 top-1.5 size-6 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center text-xs font-semibold text-gray-500 group-data-completed/timeline-item:border-blue-600 group-data-completed/timeline-item:bg-blue-600 group-data-completed/timeline-item:text-white transition-all duration-300 z-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TimelineIndicator.displayName = "TimelineIndicator"

export const TimelineDate = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "text-xs font-medium text-gray-400 group-data-completed/timeline-item:text-blue-600 sm:w-24 flex-shrink-0 sm:text-right pl-8 sm:pl-0 sm:mr-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TimelineDate.displayName = "TimelineDate"

export const TimelineTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  return (
    <h4
      ref={ref}
      className={cn(
        "text-sm font-semibold text-gray-900 group-data-completed/timeline-item:text-blue-700 pl-8 sm:pl-0",
        className
      )}
      {...props}
    >
      {children}
    </h4>
  )
})
TimelineTitle.displayName = "TimelineTitle"

export const TimelineContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "text-xs text-gray-500 pl-8 sm:pl-32 mt-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
TimelineContent.displayName = "TimelineContent"
