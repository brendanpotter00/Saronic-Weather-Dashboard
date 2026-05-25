// Thin shell: the providers live in main.tsx (Redux + MUI theme); the page lives in Dashboard,
// wrapped in an ErrorBoundary so an uncaught render error shows a fallback, not a blank page.
import { Dashboard } from './dashboard/Dashboard'
import { ErrorBoundary } from './dashboard/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  )
}

export default App
