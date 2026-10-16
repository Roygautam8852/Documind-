import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { ChatPage } from '@/features/chat/ChatPage'
import { NotFoundPage } from '@/features/error/NotFoundPage'
import { RequireAuth } from './RequireAuth'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/dashboard',
    element: <RequireAuth><DashboardPage /></RequireAuth>,
  },
  {
    path: '/documents',
    element: <RequireAuth><DocumentsPage /></RequireAuth>,
  },
  {
    path: '/chat',
    element: <RequireAuth><ChatPage /></RequireAuth>,
  },
  {
    path: '/404',
    element: <NotFoundPage />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
])
