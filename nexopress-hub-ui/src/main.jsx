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
// El script de build reemplaza __CMS_ID__ por el ID real.
export const CMS_ID = (typeof window !== 'undefined' && window.CMS_ID) || '__CMS_ID__'
export const API_BASE =
  (typeof window !== 'undefined' && window.API_BASE) ||
  `https://${CMS_ID}.sebastianvernis.workers.dev/api`

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
