import MotionExperience from './components/MotionExperience'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import VictimLayout from './layouts/VictimLayout'
import VictimHome from './pages/victim/VictimHome'
import CheckInFlow from './pages/victim/CheckInFlow'
import VictimHistory from './pages/victim/VictimHistory'
import VictimSupport from './pages/victim/VictimSupport'
import VictimProfile from './pages/victim/VictimProfile'
import CounselorLayout from './layouts/CounselorLayout'
import CounselorOverview from './pages/counselor/CounselorOverview'
import CasesPage from './pages/counselor/CasesPage'
import CaseDetail from './pages/counselor/CaseDetail'
import AlertsPage from './pages/counselor/AlertsPage'
import FollowUpsPage from './pages/counselor/FollowUpsPage'
import ResourcesPage from './pages/counselor/ResourcesPage'
import ReportsPage from './pages/counselor/ReportsPage'
import AdminPage from './pages/admin/AdminPage'
import AiSupportChat from './pages/ai/AiSupportChat'
import DailyCheckInPage from './pages/support/DailyCheckInPage'
import ExpertRecommendation from './pages/support/ExpertRecommendation'
import { homeForRole } from './context/AuthContext'

function Protected({ children, roles }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />
  return children
}

function PublicOnly({ children }) {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) return <Navigate to={homeForRole(user.role)} replace />
  return children
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

        <Route path="/app" element={<Protected roles={['VICTIM']}><VictimLayout /></Protected>}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<VictimHome />} />
          <Route path="check-in" element={<CheckInFlow />} />
          <Route path="history" element={<VictimHistory />} />
          <Route path="support" element={<VictimSupport />} />
          <Route path="profile" element={<VictimProfile />} />
          <Route path="check-in/today" element={<DailyCheckInPage />} />
          <Route path="experts" element={<ExpertRecommendation />} />
        </Route>

        <Route path="/dashboard" element={
          <Protected roles={['COUNSELOR', 'CASE_OFFICER', 'ADMIN']}><CounselorLayout /></Protected>}>
          <Route index element={<Navigate to="/dashboard/counselor" replace />} />
          <Route path="counselor" element={<CounselorOverview />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="cases/:caseNumber" element={<CaseDetail />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="followups" element={<FollowUpsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="/ai-support" element={<Protected roles={['VICTIM','COUNSELOR','CASE_OFFICER','ADMIN']}><AiSupportChat /></Protected>} />
        <Route path="/app/check-in/today" element={<Protected roles={['VICTIM']}><DailyCheckInPage /></Protected>} />
        <Route path="/app/experts" element={<Protected roles={['VICTIM']}><ExpertRecommendation /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user"><AuthProvider>
      <BrowserRouter>
        <MotionExperience><AnimatedRoutes /></MotionExperience>
      </BrowserRouter>
    </AuthProvider></MotionConfig>
  )
}
