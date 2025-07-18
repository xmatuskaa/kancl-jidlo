<template>
  <div class="min-h-screen bg-gray-50">
    <NuxtRouteAnnouncer />
    <div class="container mx-auto px-4 py-8">
      <header class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-2">🍽️ Kancl Jídlo</h1>
        <p class="text-gray-600">Denní menu z vašich oblíbených restaurací</p>
        <p class="text-sm text-gray-500 mt-2">{{ selectedDate }}</p>
      </header>

      <!-- Day selection buttons -->
      <div class="mb-6 text-center">
        <div class="flex flex-wrap justify-center gap-2 mb-4">
          <button
            v-for="day in weekDays"
            :key="day.value"
            @click="selectDay(day.value)"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-colors duration-200',
              selectedDay === day.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-300'
            ]"
          >
            {{ day.label }}
          </button>
        </div>
        
        <button
          @click="fetchMenus"
          :disabled="loading"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          <span v-if="loading" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Načítám menu...
          </span>
          <span v-else>🔄 Aktualizovat menu</span>
        </button>
      </div>

      <div v-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
        <p class="font-bold">Chyba při načítání menu:</p>
        <p>{{ error }}</p>
      </div>

      <div v-if="restaurants.length > 0" class="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="restaurant in restaurants"
          :key="restaurant.name"
          class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
        >
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-gray-800">{{ restaurant.name }}</h2>
              <div class="flex items-center">
                <span
                  :class="restaurant.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ restaurant.success ? '✅ OK' : '❌ Chyba' }}
                </span>
              </div>
            </div>
            
            <a
              :href="restaurant.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 text-sm mb-4 block break-all"
            >
              🔗 {{ restaurant.url }}
            </a>

            <div v-if="restaurant.success && restaurant.menuItems.length > 0">
              <h3 class="text-lg font-medium text-gray-700 mb-3">Menu:</h3>
              <ul class="space-y-2">
                <li
                  v-for="(item, index) in restaurant.menuItems"
                  :key="index"
                  class="p-3 bg-gray-50 rounded border-l-4 border-blue-500 text-sm"
                >
                  {{ item }}
                </li>
              </ul>
            </div>

            <div v-else-if="restaurant.success && restaurant.menuItems.length === 0" class="text-gray-500 text-center py-4">
              Žádné menu nenalezeno. Možná se změnila struktura stránky.
            </div>

            <div v-else class="text-red-500 text-center py-4">
              <p>Chyba při načítání menu:</p>
              <p class="text-sm">{{ restaurant.error }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="text-center py-12">
        <p class="text-gray-500 text-lg">Vyberte den a klikněte na "Aktualizovat menu" pro načtení menu.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const loading = ref(false)
const error = ref('')
const restaurants = ref([])
const selectedDay = ref(null)
const selectedDate = ref('')

// Define weekdays (Monday=1 to Friday=5)
const weekDays = [
  { value: 1, label: 'Pondělí' },
  { value: 2, label: 'Úterý' },
  { value: 3, label: 'Středa' },
  { value: 4, label: 'Čtvrtek' },
  { value: 5, label: 'Pátek' }
]

// Initialize with current day or Monday if weekend
const initializeDay = () => {
  const today = new Date()
  const currentDay = today.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  
  // If it's weekend (Sunday=0 or Saturday=6), default to Monday (1)
  if (currentDay === 0 || currentDay === 6) {
    selectedDay.value = 1
  } else {
    selectedDay.value = currentDay
  }
  
  updateSelectedDate()
}

const updateSelectedDate = () => {
  if (!selectedDay.value) return
  
  const today = new Date()
  const currentWeekDay = today.getDay()
  const daysToAdd = selectedDay.value - currentWeekDay
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + daysToAdd)
  
  selectedDate.value = targetDate.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const selectDay = (day) => {
  selectedDay.value = day
  updateSelectedDate()
  // Auto-fetch menus when day is selected
  fetchMenus()
}

const fetchMenus = async () => {
  if (!selectedDay.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    const data = await $fetch(`/api/menus?day=${selectedDay.value}`)
    
    if (data.success) {
      restaurants.value = data.restaurants
      if (data.date) {
        selectedDate.value = data.date
      }
    } else {
      error.value = data.error || 'Neznámá chyba při načítání menu'
    }
  } catch (err) {
    error.value = 'Chyba při komunikaci se serverem: ' + err.message
  } finally {
    loading.value = false
  }
}

const formatTime = (dateString) => {
  if (!dateString) return 'Neznámo'
  return new Date(dateString).toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Initialize day and auto-load menus on component mount
onMounted(() => {
  initializeDay()
  fetchMenus()
})
</script>

<style>
/* Add any component-specific styles here */
</style>
