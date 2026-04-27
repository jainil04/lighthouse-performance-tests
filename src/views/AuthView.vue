<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const router = useRouter()
const isDarkMode = inject('isDarkMode', ref(false))
const login = inject('login')

// step: 'email' | 'login' | 'signup'
const step = ref('email')
const direction = ref('forward') // for transition

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const goBack = () => {
  direction.value = 'back'
  error.value = ''
  password.value = ''
  step.value = 'email'
}

const checkEmail = async () => {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Email is required.'
    return
  }
  loading.value = true
  try {
    const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email.value.trim())}`)
    if (!res.ok) throw new Error('Server error')
    const data = await res.json()
    direction.value = 'forward'
    step.value = data.exists ? 'login' : 'signup'
  } catch {
    error.value = 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleLogin = async () => {
  error.value = ''
  if (!password.value) { error.value = 'Password is required.'; return }
  loading.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value })
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = res.status === 401 ? 'Incorrect password.' : (data.error || 'Login failed.')
      return
    }
    login(data.token, data.user)
    router.push('/')
  } catch {
    error.value = 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleSignup = async () => {
  error.value = ''
  if (!password.value) { error.value = 'Password is required.'; return }
  loading.value = true
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value })
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Signup failed.'
      return
    }
    login(data.token, data.user)
    router.push('/')
  } catch {
    error.value = 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

const onEmailKeydown = (e) => { if (e.key === 'Enter') checkEmail() }
const onPasswordKeydown = (e) => {
  if (e.key === 'Enter') {
    if (step.value === 'login') handleLogin()
    else handleSignup()
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[80vh] px-4">
    <div
      :class="[
        'w-full max-w-sm rounded-xl border shadow-sm p-8',
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      ]"
    >
      <Transition :name="direction === 'forward' ? 'slide-forward' : 'slide-back'" mode="out-in">

        <!-- Step 1: Email -->
        <div v-if="step === 'email'" key="email">
          <h1 :class="['text-2xl font-semibold mb-1', isDarkMode ? 'text-white' : 'text-gray-900']">
            Welcome
          </h1>
          <p :class="['text-sm mb-6', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Enter your email to continue.
          </p>

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <label :class="['text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Email address
              </label>
              <InputText
                v-model="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                class="w-full"
                :invalid="!!error"
                @keydown="onEmailKeydown"
              />
              <p v-if="error" class="text-sm text-red-500 mt-0.5">{{ error }}</p>
            </div>

            <Button
              label="Continue"
              class="w-full"
              :loading="loading"
              @click="checkEmail"
            />
          </div>
        </div>

        <!-- Step 2a: Login -->
        <div v-else-if="step === 'login'" key="login">
          <h1 :class="['text-2xl font-semibold mb-1', isDarkMode ? 'text-white' : 'text-gray-900']">
            Log in
          </h1>
          <p :class="['text-sm mb-6', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Welcome back.
          </p>

          <div class="flex flex-col gap-4">
            <!-- Non-editable email with change link -->
            <div class="flex flex-col gap-1">
              <label :class="['text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Email address
              </label>
              <div
                :class="[
                  'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                ]"
              >
                <span>{{ email }}</span>
                <button
                  :class="['text-xs font-medium underline', isDarkMode ? 'text-blue-400' : 'text-blue-600']"
                  @click="goBack"
                >
                  Change
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label :class="['text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Password
              </label>
              <InputText
                v-model="password"
                type="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                class="w-full"
                :invalid="!!error"
                @keydown="onPasswordKeydown"
              />
              <p v-if="error" class="text-sm text-red-500 mt-0.5">{{ error }}</p>
            </div>

            <!-- Forgot password — disabled/greyed -->
            <div class="flex justify-end">
              <span
                title="Coming soon"
                :class="['text-xs cursor-not-allowed select-none', isDarkMode ? 'text-gray-600' : 'text-gray-400']"
              >
                Forgot password?
              </span>
            </div>

            <Button
              label="Log in"
              class="w-full"
              :loading="loading"
              @click="handleLogin"
            />
          </div>
        </div>

        <!-- Step 2b: Signup -->
        <div v-else-if="step === 'signup'" key="signup">
          <h1 :class="['text-2xl font-semibold mb-1', isDarkMode ? 'text-white' : 'text-gray-900']">
            Create account
          </h1>
          <p :class="['text-sm mb-6', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            No account yet — let's get you set up.
          </p>

          <div class="flex flex-col gap-4">
            <!-- Non-editable email with change link -->
            <div class="flex flex-col gap-1">
              <label :class="['text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Email address
              </label>
              <div
                :class="[
                  'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                ]"
              >
                <span>{{ email }}</span>
                <button
                  :class="['text-xs font-medium underline', isDarkMode ? 'text-blue-400' : 'text-blue-600']"
                  @click="goBack"
                >
                  Change
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label :class="['text-sm font-medium', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                Password
              </label>
              <InputText
                v-model="password"
                type="password"
                placeholder="At least 8 characters"
                autocomplete="new-password"
                class="w-full"
                :invalid="!!error"
                @keydown="onPasswordKeydown"
              />
              <p v-if="error" class="text-sm text-red-500 mt-0.5">{{ error }}</p>
            </div>

            <Button
              label="Create account"
              class="w-full"
              :loading="loading"
              @click="handleSignup"
            />
          </div>
        </div>

      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-forward-enter-active,
.slide-forward-leave-active,
.slide-back-enter-active,
.slide-back-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.slide-forward-enter-from { opacity: 0; transform: translateX(24px); }
.slide-forward-leave-to  { opacity: 0; transform: translateX(-24px); }
.slide-back-enter-from   { opacity: 0; transform: translateX(-24px); }
.slide-back-leave-to     { opacity: 0; transform: translateX(24px); }
</style>
