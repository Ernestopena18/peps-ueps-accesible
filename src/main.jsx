import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// ÍNDICE DE CREACIÓN
// 01 28/08/2026 creación de Inicio.
//
// ÍNDICE DE MODIFICACIONES

function App() {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <span className="eyebrow">Aprendizaje accesible</span>
        <h1 id="page-title">Aprendé PEPS y UEPS</h1>
        <p>
          Una experiencia clara, amigable y pensada para personas con dislexia y discalculia.
        </p>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
