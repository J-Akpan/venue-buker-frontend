import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import './styles.css'
import './polish.css'

// Remove credentials left by the retired localStorage mock-auth prototype.
try {
    if (localStorage.getItem('vb_users') !== null) {
        localStorage.removeItem('vb_users')
        localStorage.removeItem('vb_session')
    }
} catch { /* storage may be unavailable */ }

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <ToastProvider>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                </ToastProvider>
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>,
)
