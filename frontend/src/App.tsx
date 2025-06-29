import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <div>
        <h1>tugical Admin Dashboard</h1>
        <p>次の時間が、もっと自由になる。</p>
      </div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          管理画面開発中...
        </p>
      </div>
    </div>
  )
}

export default App
