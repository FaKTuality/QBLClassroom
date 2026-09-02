import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store/store.js'
import { Provider } from 'react-redux'
import { AuthProvider } from './store/authProvider.jsx'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <AuthProvider>
      <BrowserRouter> 
        <StrictMode>
        <App />
      </StrictMode>
      </BrowserRouter>
    </AuthProvider>
  </Provider>

,
)
