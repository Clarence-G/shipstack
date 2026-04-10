import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import type React from 'react'
import { useCallback, useRef } from 'react'
import { Pressable, View } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/**
 * Sheet — mobile bottom sheet built on @gorhom/bottom-sheet.
 *
 * Mirrors the frontend's Sheet API names (SheetHeader, SheetTitle, SheetFooter, etc.)
 * while using BottomSheetModal under the hood.
 *
 * Requires <SheetProvider> in the root layout (already in _layout.tsx via GestureHandlerRootView).
 */

// Re-export the provider — must wrap the app root
const SheetProvider = BottomSheetModalProvider

// Hook to get a sheet ref + open/close helpers
function useSheet() {
  const ref = useRef<BottomSheetModal>(null)

  const open = useCallback(() => {
    ref.current?.present()
  }, [])

  const close = useCallback(() => {
    ref.current?.dismiss()
  }, [])

  return { ref, open, close }
}

// Backdrop with fade + tap-to-dismiss
function SheetBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
}

interface SheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>
  snapPoints?: (string | number)[]
  children: React.ReactNode
  enableDynamicSizing?: boolean
  onDismiss?: () => void
}

function Sheet({
  sheetRef,
  snapPoints,
  children,
  enableDynamicSizing = true,
  onDismiss,
}: SheetProps) {
  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose
      backdropComponent={SheetBackdrop}
      onDismiss={onDismiss}
      backgroundStyle={{ backgroundColor: 'transparent' }}
      handleIndicatorStyle={{ backgroundColor: '#a1a1aa' }}
    >
      {children}
    </BottomSheetModal>
  )
}

function SheetContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <BottomSheetView>
      <View className={cn('rounded-t-2xl bg-card px-4 pb-8 pt-2', className)}>{children}</View>
    </BottomSheetView>
  )
}

function SheetScrollContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <BottomSheetScrollView>
      <View className={cn('rounded-t-2xl bg-card px-4 pb-8 pt-2', className)}>{children}</View>
    </BottomSheetScrollView>
  )
}

function SheetHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <View className={cn('gap-1 pb-4', className)}>{children}</View>
}

function SheetTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Text className={cn('text-base font-medium text-foreground', className)}>{children}</Text>
}

function SheetDescription({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>
}

function SheetFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <View className={cn('mt-auto flex-col gap-2 pt-4', className)}>{children}</View>
}

function SheetClose({
  className,
  children,
  onPress,
}: {
  className?: string
  children: React.ReactNode
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} className={cn(className)}>
      {children}
    </Pressable>
  )
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetProvider,
  SheetScrollContent,
  SheetTitle,
  useSheet,
}
