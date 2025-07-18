import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FileUploadView from '../views/FileUploadView.vue'
import DocumentationView from '../views/DocumentationView.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
