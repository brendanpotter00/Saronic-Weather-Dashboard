import './App.css'
import { useGetCombinedForecastQuery } from './forecast/forecastApi'

function App() {
  const { isLoading, error } = useGetCombinedForecastQuery()

  return (
    <main className="app">
      <h1>Saronic Weather Dashboard</h1>
      <p>10-day demo weather look-ahead for Gulfport, MS.</p>
      {isLoading && <p>Loading forecast…</p>}
      {error && <p role="alert">Couldn’t load the forecast.</p>}
    </main>
  )
}

export default App
