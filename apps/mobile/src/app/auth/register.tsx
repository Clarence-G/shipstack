import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SignUpForm } from '@/components/block/sign-up-form'
import { signUp } from '@/lib/auth-client'

export default function RegisterScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      await signUp.email({ email, password, name })
      router.replace('/')
    } catch (err) {
      Alert.alert(
        'Registration Failed',
        err instanceof Error ? err.message : 'Registration failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-1 items-center justify-center p-4"
        keyboardDismissMode="interactive"
      >
        <SignUpForm
          onSubmit={handleSignUp}
          onNavigateToSignIn={() => router.push('/auth/login')}
          loading={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
