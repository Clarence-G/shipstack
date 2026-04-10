import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Platform, Pressable } from 'react-native'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

interface DateInputProps {
  value?: Date
  onChange: (date: Date) => void
  placeholder?: string
  mode?: 'date' | 'time' | 'datetime'
  minimumDate?: Date
  maximumDate?: Date
  className?: string
  disabled?: boolean
}

function formatDate(date: Date, mode: 'date' | 'time' | 'datetime'): string {
  if (mode === 'time') {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  if (mode === 'datetime') {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function DateInput({
  value,
  onChange,
  placeholder = 'Select date',
  mode = 'date',
  minimumDate,
  maximumDate,
  className,
  disabled = false,
}: DateInputProps) {
  const [show, setShow] = useState(false)

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false)
    }
    if (selectedDate) {
      onChange(selectedDate)
    }
  }

  const handleConfirm = () => {
    setShow(false)
  }

  return (
    <>
      <Pressable
        onPress={() => !disabled && setShow(true)}
        className={cn(
          'dark:bg-input/30 border-input bg-background flex h-10 w-full flex-row items-center rounded-md border px-3 py-1 shadow-sm shadow-black/5 sm:h-9',
          disabled && 'opacity-50',
          className,
        )}
      >
        <Text
          className={cn(
            'text-base leading-5 sm:text-sm',
            value ? 'text-foreground' : 'text-muted-foreground/50',
          )}
        >
          {value ? formatDate(value, mode) : placeholder}
        </Text>
      </Pressable>

      {show && (
        <>
          <DateTimePicker
            value={value ?? new Date()}
            mode={mode === 'datetime' ? 'date' : mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
          {Platform.OS === 'ios' && (
            <Pressable onPress={handleConfirm} className="items-end px-3 py-2">
              <Text className="text-primary text-base font-medium">Done</Text>
            </Pressable>
          )}
        </>
      )}
    </>
  )
}

export type { DateInputProps }
export { DateInput }
