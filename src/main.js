import { createApp } from 'vue'
import './style.css'
// import './themes/primeVueOverrides.css'
import App from './App.vue'

import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip'
import 'primeicons/primeicons.css';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import * as CustomSelectTheme from './themes/aura.js';

const app = createApp(App);



const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
            950: '#431407'
        },
        colorScheme: {
            light: {
                primary: {
                    color: '#1f2937',
                    inverseColor: '#ffffff',
                    hoverColor: '#374151',
                    activeColor: '#111827'
                },
                surface: {
                    0: '#ffffff',
                    50: '{zinc.50}',
                    100: '{zinc.100}',
                    200: '{zinc.200}',
                    300: '{zinc.300}',
                    400: '{zinc.400}',
                    500: '{zinc.500}',
                    600: '{zinc.600}',
                    700: '{zinc.700}',
                    800: '{zinc.800}',
                    900: '{zinc.900}',
                    950: '{zinc.950}'
                }
            },
            dark: {
                primary: {
                    color: '#f3f4f6',
                    inverseColor: '#000000',
                    hoverColor: '#e5e7eb',
                    activeColor: '#d1d5db'
                },
                surface: {
                    0: '#ffffff',
                    50: '{slate.50}',
                    100: '{slate.100}',
                    200: '{slate.200}',
                    300: '{slate.300}',
                    400: '{slate.400}',
                    500: '{slate.500}',
                    600: '{slate.600}',
                    700: '{slate.700}',
                    800: '{slate.800}',
                    900: '{slate.900}',
                    950: '{slate.950}'
                }
            }
        }
    },
    components: {
        select: CustomSelectTheme.default
    }
});

app.use(PrimeVue, {
    theme: {
        preset: MyPreset,
        options: {
            prefix: 'p',
            darkModeSelector: '.dark',
            cssLayer: false
        }
    }
});

app.directive('tooltip', Tooltip)

app.mount('#app')
