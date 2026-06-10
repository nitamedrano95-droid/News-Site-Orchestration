import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import './index.css'

// Centralized API base — in production, the UI is hosted on Pages
// but the API lives on the Hub Worker. Vite replaces VITE_API_BASE
// at build time; for local dev it falls back to '/api' (proxied by Vite).
export const API_BASE =
  import.meta.env.VITE_API_BASE || 'https://nexopress-hub.sebastianvernis.workers.dev/api'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('hub_token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:cms/:articleId"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
