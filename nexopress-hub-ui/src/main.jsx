import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Gallery from './pages/Gallery'
import Articles from './pages/Articles'
import CMS from './pages/CMS'
import Users from './pages/Users'
import './index.css'

// CMS editor standalone: each Pages deployment points to its own CMS Worker.
//
// Resolución de CMS_ID (en orden de prioridad):
//  1. window.CMS_ID           ← inyectado por build-all-admins.sh en <head>
//  2. import.meta.env.VITE_CMS_ID ← reemplazado por Vite en build con
//                                   --define o .env.production
//  3. Fallback explícito ''    ← no se usa placeholder (causa 404s)
//
// IMPORTANTE: nunca usar el placeholder literal (formato doble guion bajo
// + CMS_ID + doble guion bajo) en runtime; Vite lo trata como un string
// estatico y termina en produccion generando URLs a un host inexistente
// que devuelven 404 sin CORS.
const RUNTIME_CMS_ID =
  (typeof window !== 'undefined' && window.CMS_ID) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CMS_ID) ||
  ''

export const CMS_ID = RUNTIME_CMS_ID
export const API_BASE =
  (typeof window !== 'undefined' && window.API_BASE) ||
  (RUNTIME_CMS_ID ? `https://${RUNTIME_CMS_ID}.sebastianvernis.workers.dev/api` : '/api')

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('cms_token')
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
          path="/editor/:articleId"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/articles"
          element={
            <ProtectedRoute>
              <Articles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cms"
          element={
            <ProtectedRoute>
              <CMS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gallery"
          element={
            <ProtectedRoute>
              <Gallery />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
