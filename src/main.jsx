import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// ÍNDICE DE CREACIÓN
// 01 28/08/2026 creación de Inicio.
//
// ÍNDICE DE MODIFICACIONES
// 01 28/08/2026 transformación de Inicio en un instructivo interactivo de UEPS por tarjetas.

const ledger = [
  { date: '3/05', movement: 'Compra 950 u. × $110', entry: '$104.500', exit: '—', stock: '950 u. · $104.500' },
  { date: '5/05', movement: 'Compra 200 u. × $125', entry: '$25.000', exit: '—', stock: '1.150 u. · $129.500' },
  { date: '8/05', movement: 'Venta de 850 u.', entry: '—', exit: '$96.500', stock: '300 u. · $33.000' },
  { date: '10/05', movement: 'Compra 220 u. × $130', entry: '$28.600', exit: '—', stock: '520 u. · $61.600' },
  { date: '12/05', movement: 'Venta de 150 u.', entry: '—', exit: '$19.500', stock: '370 u. · $42.100' },
]

const lessons = [
  {
    phase: 'Antes de empezar',
    title: 'Cómo funciona UEPS',
    intro: 'Último en entrar, primero en salir.',
    tableStep: 0,
    facts: [
      ['Regla principal', 'Para valuar una venta, empezamos por el lote más nuevo.'],
      ['Clave visual', 'Las compras entran; las ventas consumen lotes desde el último.'],
    ],
    formula: ['UEPS', 'ÚLTIMO EN ENTRAR', 'PRIMERO EN SALIR'],
    note: 'El precio de venta no es el costo. Para la salida usamos el costo de los lotes en existencia.',
  },
  {
    phase: 'Movimiento 1 · Compra',
    title: 'Primera compra',
    intro: 'El 3/05 compramos 950 unidades a $110 cada una.',
    tableStep: 1,
    facts: [
      ['Cantidad', '950 unidades'],
      ['Precio unitario', '$110'],
    ],
    formula: ['Precio total', '950 × $110', '$104.500'],
    note: 'Es el primer lote. Por ahora también es el más nuevo.',
  },
  {
    phase: 'Movimiento 2 · Compra',
    title: 'Entra un lote nuevo',
    intro: 'El 5/05 compramos 200 unidades a $125 cada una.',
    tableStep: 2,
    facts: [
      ['Lote anterior', '950 unidades a $110'],
      ['Lote nuevo', '200 unidades a $125'],
    ],
    formula: ['Existencia total', '950 + 200', '1.150 unidades'],
    note: 'Conservamos los lotes separados: tienen costos diferentes.',
  },
  {
    phase: 'Movimiento 3 · Venta',
    title: 'Vendemos 850 unidades',
    intro: 'El 8/05 se venden 850 unidades a $140 cada una.',
    tableStep: 2,
    pending: { date: '8/05', movement: 'Venta de 850 u.', entry: '—', exit: 'Por calcular', stock: 'Por calcular' },
    facts: [
      ['Cantidad que sale', '850 unidades'],
      ['Precio de venta', '$140 por unidad'],
    ],
    formula: ['Pregunta UEPS', '¿Qué lote entró último?', 'El de $125'],
    note: '$140 es precio de venta. Para calcular el costo buscamos los lotes almacenados.',
  },
  {
    phase: 'Movimiento 3 · Resolver',
    title: 'Sacamos primero lo más nuevo',
    intro: 'El lote de $125 tiene 200 unidades. Las usamos completas y todavía faltan 650.',
    tableStep: 3,
    facts: [
      ['Último lote', '200 × $125 = $25.000'],
      ['Lote anterior', '650 × $110 = $71.500'],
    ],
    formula: ['Costo de salida', '$25.000 + $71.500', '$96.500'],
    note: 'UEPS toma primero las 200 unidades más recientes y completa con 650 del lote anterior.',
  },
  {
    phase: 'Movimiento 3 · Existencia',
    title: '¿Qué quedó después?',
    intro: 'Del lote de 950 unidades a $110 usamos 650.',
    tableStep: 3,
    facts: [
      ['Cantidad restante', '950 − 650 = 300'],
      ['Lote de $125', 'Se usó completo'],
    ],
    formula: ['Existencia', '300 × $110', '$33.000'],
    note: 'Después de la venta queda un único lote: 300 unidades a $110.',
  },
  {
    phase: 'Movimiento 4 · Compra',
    title: 'Agregamos un lote',
    intro: 'El 10/05 compramos 220 unidades a $130 cada una.',
    tableStep: 4,
    facts: [
      ['Lote anterior', '300 unidades a $110'],
      ['Lote nuevo', '220 unidades a $130'],
    ],
    formula: ['Existencia total', '$33.000 + $28.600', '$61.600'],
    note: 'El lote de $130 queda arriba: es el primero que saldrá en la próxima venta.',
  },
  {
    phase: 'Movimiento 5 · Venta',
    title: 'Vendemos 150 unidades',
    intro: 'El 12/05 se venden 150 unidades. El lote más nuevo tiene 220 a $130.',
    tableStep: 5,
    facts: [
      ['Cantidad que sale', '150 unidades'],
      ['Lote elegido', 'El último: 220 a $130'],
    ],
    formula: ['Costo de salida', '150 × $130', '$19.500'],
    note: 'Como el último lote alcanza, no necesitamos tocar el lote anterior.',
  },
  {
    phase: 'Resultado final',
    title: 'Así termina la existencia',
    intro: 'Quedan dos lotes, porque del último usamos solo 150 de sus 220 unidades.',
    tableStep: 5,
    facts: [
      ['Lote anterior', '300 × $110 = $33.000'],
      ['Lote más nuevo', '70 × $130 = $9.100'],
    ],
    formula: ['Existencia final', '$33.000 + $9.100', '370 unidades · $42.100'],
    note: 'Chequeo: 520 − 150 = 370 unidades. La cantidad y el valor final coinciden.',
  },
]

function MenuIcon() {
  return <span className="menu-icon" aria-hidden="true"><i /><i /><i /></span>
}

function TableIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9h18M9 9v11" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ArrowIcon({ direction }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LessonCard({ lesson, current, total }) {
  return (
    <article className="lesson-card" aria-live="polite">
      <div className="lesson-heading">
        <span className="phase-pill">{lesson.phase}</span>
        <span className="step-count">{String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      </div>
      <div className="lesson-copy">
        <h1>{lesson.title}</h1>
        <p className="intro">{lesson.intro}</p>
      </div>
      <div className="facts-grid">
        {lesson.facts.map(([label, value]) => (
          <div className="fact" key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="formula" aria-label={`${lesson.formula[0]}: ${lesson.formula[1]} = ${lesson.formula[2]}`}>
        <span>{lesson.formula[0]}</span><b>{lesson.formula[1]}</b><i aria-hidden="true">→</i><strong>{lesson.formula[2]}</strong>
      </div>
      <p className="lesson-note"><span aria-hidden="true">✦</span>{lesson.note}</p>
    </article>
  )
}

function LessonIndex({ current, onSelect, onClose }) {
  return (
    <div className="overlay index-overlay" onMouseDown={onClose} role="presentation">
      <aside className="index-panel" onMouseDown={(event) => event.stopPropagation()} aria-label="Índice de pasos">
        <div className="panel-heading">
          <div><span>Índice</span><h2>Aprender UEPS</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Cerrar índice">×</button>
        </div>
        <nav>
          {lessons.map((lesson, index) => (
            <button className={index === current ? 'index-item active' : 'index-item'} key={lesson.title} onClick={() => onSelect(index)} aria-current={index === current ? 'step' : undefined}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><small>{lesson.phase}</small><strong>{lesson.title}</strong></div>
            </button>
          ))}
        </nav>
      </aside>
    </div>
  )
}

function StockTable({ lesson }) {
  const rows = ledger.slice(0, lesson.tableStep)
  if (lesson.pending) rows.push(lesson.pending)
  return (
    <table>
      <thead><tr><th>Fecha</th><th>Movimiento</th><th>Entrada</th><th>Salida</th><th>Existencia</th></tr></thead>
      <tbody>
        {rows.length ? rows.map((row, index) => (
          <tr key={`${row.date}-${index}`} className={index === rows.length - 1 ? 'current-row' : ''}>
            <td>{row.date}</td><td>{row.movement}</td><td>{row.entry}</td><td>{row.exit}</td><td>{row.stock}</td>
          </tr>
        )) : <tr className="empty-row"><td colSpan="5">La tabla comienza sin existencias.</td></tr>}
      </tbody>
    </table>
  )
}

function TableModal({ lesson, onClose }) {
  return (
    <div className="overlay modal-overlay" onMouseDown={onClose} role="presentation">
      <section className="table-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="table-title">
        <div className="modal-heading">
          <div><span>{lesson.phase}</span><h2 id="table-title">Así queda en la tabla</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Cerrar tabla">×</button>
        </div>
        <div className="table-frame"><StockTable lesson={lesson} /></div>
        <p className="modal-caption"><i aria-hidden="true" />La fila resaltada muestra el movimiento de esta tarjeta.</p>
      </section>
    </div>
  )
}

function App() {
  const [current, setCurrent] = useState(0)
  const [openLayer, setOpenLayer] = useState(null)
  const lesson = lessons[current]

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpenLayer(null)
      if (openLayer) return
      if (event.key === 'ArrowRight') setCurrent((value) => Math.min(value + 1, lessons.length - 1))
      if (event.key === 'ArrowLeft') setCurrent((value) => Math.max(value - 1, 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openLayer])

  const goTo = (index) => { setCurrent(index); setOpenLayer(null) }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <button className="top-action menu-button" onClick={() => setOpenLayer('index')} aria-label="Abrir índice" aria-expanded={openLayer === 'index'}><MenuIcon /><span>Índice</span></button>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); goTo(0) }} aria-label="Volver al inicio de UEPS"><span>U</span><strong>UEPS visual</strong></a>
        <button className="top-action table-button" onClick={() => setOpenLayer('table')} aria-label="Abrir Así queda en la tabla" aria-expanded={openLayer === 'table'}><span>Así queda en la tabla</span><TableIcon /></button>
      </header>
      <section className="stage" aria-label="Instructivo de UEPS"><LessonCard lesson={lesson} current={current} total={lessons.length} /></section>
      <footer className="lesson-nav">
        <button onClick={() => setCurrent((value) => Math.max(value - 1, 0))} disabled={current === 0}><ArrowIcon direction="left" /><span>Anterior</span></button>
        <div className="progress" aria-label={`Paso ${current + 1} de ${lessons.length}`}>{lessons.map((item, index) => <i key={item.title} className={index === current ? 'active' : ''} />)}</div>
        <button onClick={() => setCurrent((value) => Math.min(value + 1, lessons.length - 1))} disabled={current === lessons.length - 1}><span>Siguiente</span><ArrowIcon direction="right" /></button>
      </footer>
      {openLayer === 'index' && <LessonIndex current={current} onSelect={goTo} onClose={() => setOpenLayer(null)} />}
      {openLayer === 'table' && <TableModal lesson={lesson} onClose={() => setOpenLayer(null)} />}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
