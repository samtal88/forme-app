import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Landing from './pages/Landing'
import { SignIn, SignUp } from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Feed from './pages/Feed'
import Sources from './pages/Sources'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/sources" element={<Sources />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App