import { useMemo } from 'react'
import { View } from 'react-native'
import { Label } from '@/components/ui/label'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

function FieldGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return <View className={cn('w-full gap-5', className)}>{children}</View>
}

function Field({ className, children }: { className?: string; children: React.ReactNode }) {
  return <View className={cn('w-full gap-2', className)}>{children}</View>
}

function FieldLabel({
  className,
  nativeID,
  children,
}: {
  className?: string
  nativeID?: string
  children: React.ReactNode
}) {
  return (
    <Label nativeID={nativeID} className={cn(className)}>
      {children}
    </Label>
  )
}

function FieldDescription({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>
}

function FieldError({
  className,
  children,
  errors,
}: {
  className?: string
  children?: React.ReactNode
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) return children
    if (!errors?.length) return null
    const messages = errors.filter((e) => e?.message).map((e) => e!.message!)
    if (messages.length === 0) return null
    if (messages.length === 1) return messages[0]
    return messages.join('\n')
  }, [children, errors])

  if (!content) return null

  return (
    <Text role="alert" className={cn('text-sm text-destructive', className)}>
      {content}
    </Text>
  )
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel }
