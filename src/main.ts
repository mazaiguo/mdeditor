import { createApp } from 'vue'
import App from './App.vue'

// Modular stylesheets (split from the former monolithic style.css)
import './styles/base.css'
import './styles/layout.css'
import './styles/toolbar.css'
import './styles/editor.css'
import './styles/preview.css'
import './styles/codeblock.css'
import './styles/sidepanel.css'
import './styles/statusbar.css'
import './styles/modals.css'

createApp(App).mount('#app')
