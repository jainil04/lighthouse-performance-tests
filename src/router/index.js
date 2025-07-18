import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FileUploadView from '../views/FileUploadView.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
