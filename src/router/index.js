import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FileUploadView from '../views/FileUploadView.vue'
import DocumentationView from '../views/DocumentationView.vue'
import AuthView from '../views/AuthView.vue'
import HistoryView from '../views/HistoryView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/upload',
    name: 'upload',
    component: FileUploadView
  },
  {
    path: '/documentation',
    name: 'documentation',
    component: DocumentationView
  },
  {
    path: '/auth',
    name: 'auth',
    component: AuthView
  },
  {
    path: '/history',
    name: 'history',
    component: HistoryView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const isAuthenticated = !!localStorage.getItem('lh_token')
  if (to.name === 'auth' && isAuthenticated) return { name: 'home' }
  if (to.name === 'history' && !isAuthenticated) return { name: 'auth' }
  return true
})

export default router
