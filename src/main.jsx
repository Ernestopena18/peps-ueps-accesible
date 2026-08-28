import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { chapters, fullTableByMethod, fullTableGroups, lessonsByMethod, roleMeta, zoneMeta } from './lessonData'
import { buildExerciseFlow, formatMoney, formatQuantity, parseLocalizedNumber, validateExerciseRows } from './exerciseBuilder'
import './styles.css'

// ÍNDICE DE CREACIÓN
// 01 28/08/2026 creación de Inicio.
//
// ÍNDICE DE MODIFICACIONES
// 01 28/08/2026 transformación de Inicio en un instructivo interactivo de UEPS por tarjetas.
// 02 28/08/2026 reorganización del instructivo y animación de recortes de la ficha de stock.
// 03 28/08/2026 aplicación del código cromático pedagógico a toda la experiencia.
// 04 28/08/2026 incorporación del selector PEPS/UEPS y reorganización de controles.
// 05 28/08/2026 ampliación y suavizado del botón Ver en la tabla.
// 06 28/08/2026 incorporación de tabla completa progresiva con zoom táctil.
// 07 28/08/2026 incorporación de pantalla inicial y generador de ejercicios personalizados.

const STORAGE_KEY = 'peps-ueps-custom-exercise:v1'
const EMPTY_ROW = { code: '', date: '', detail: '', operation: 'entry', quantity: '', unitPrice: '' }

function readSavedExercise() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (saved?.version === 1 && Array.isArray(saved.rows)) return { method: saved.method === 'PEPS' ? 'PEPS' : 'UEPS', rows: saved.rows }
  } catch {
    // Si el guardado local está dañado, empezamos con un formulario limpio.
  }
  return { method: 'UEPS', rows: [] }
}

function getFactRole(label, fallback) {
  const normalized = label.toLocaleLowerCase('es')
  if (normalized.includes('precio unitario') || normalized.includes('precio de venta')) return 'unit'
  if (normalized.includes('fecha') || normalized.includes('detalle')) return 'data'
  if (normalized.includes('cantidad que sale') || normalized.includes('salida completa')) return 'exit'
  if (normalized.includes('costo')) return 'calculation'
  if (normalized.includes('lote') || normalized.includes('existencia') || normalized.includes('restante') || normalized.includes('final')) return 'stock'
  return fallback
}

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

function ReplayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 11.7 2.6L20 14M4 10l2.8-3.6A7 7 0 0 1 18.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LessonCard({ lesson, current, total, onOpenTable }) {
  const formulaLabelRole = roleMeta[lesson.formulaRoles[0]]
  return (
    <article
      className={`lesson-card role-${lesson.role}`}
      style={{ '--lesson-accent': roleMeta[lesson.role].color, '--formula-label': formulaLabelRole.color }}
      aria-live="polite"
    >
      <div className="lesson-heading">
        <span className="phase-pill">{lesson.phase}</span>
        <span className="step-count">{String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
      </div>
      <div className="lesson-copy">
        <h1>{lesson.title}</h1>
        <p className="intro">{lesson.intro}</p>
      </div>
      <div className="facts-grid">
        {lesson.facts.map(([label, value]) => {
          const factRole = getFactRole(label, lesson.role)
          return <div className={`fact fact-${factRole}`} style={{ '--fact-color': roleMeta[factRole].color }} key={label}><span>{label}</span><strong>{value}</strong></div>
        })}
      </div>
      <div className="formula" aria-label={`${lesson.formula[0]}: ${lesson.formula[1]} → ${lesson.formula[2]}`}>
        <span>{lesson.formula[0]}</span><b>{lesson.formula[1]}</b><i aria-hidden="true">→</i><strong>{lesson.formula[2]}</strong>
      </div>
      <p className="lesson-note"><span aria-hidden="true">✦</span>{lesson.note}</p>
      <button className="card-table-button" onClick={onOpenTable}><TableIcon />Ver en la tabla</button>
    </article>
  )
}

function LessonIndex({ current, method, flowChapters, onSelect, onClose }) {
  return (
    <div className="overlay index-overlay" onMouseDown={onClose} role="presentation">
      <aside className="index-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="index-title">
        <div className="panel-heading">
          <div><span>Índice</span><h2 id="index-title">Ficha {method}</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Cerrar índice">×</button>
        </div>
        <nav style={{ '--chapter-count': flowChapters.length }}>
          {flowChapters.map((chapter) => {
            const active = current >= chapter.start && current <= chapter.end
            const range = chapter.start === chapter.end ? `Paso ${chapter.start + 1}` : `Pasos ${chapter.start + 1}–${chapter.end + 1}`
            return (
              <button className={active ? 'index-item active' : 'index-item'} style={{ '--chapter-color': roleMeta[chapter.role].color }} key={chapter.code} onClick={() => onSelect(chapter.start)} aria-current={active ? 'step' : undefined}>
                <span>{chapter.code}</span>
                <div><small>{range}</small><strong>{chapter.title}</strong></div>
              </button>
            )
          })}
        </nav>
        <p className="index-tip">Elegí un movimiento. Después avanzá con Anterior y Siguiente.</p>
      </aside>
    </div>
  )
}

function ZoneCrop({ zone, reveal, run }) {
  const meta = zoneMeta[zone.type]
  return (
    <section className={`zone-crop zone-${zone.type} ${reveal ? 'is-filled' : 'is-empty'}`} style={{ '--zone-color': meta.color }} aria-label={`Recorte de la zona ${meta.label}, ${zone.row}`}>
      <div className="crop-heading"><span>Recorte</span><strong>{zone.row}</strong></div>
      <div className="zone-table">
        <div className="zone-band">{meta.label}</div>
        <div className={`zone-grid columns-${zone.cells.length}`} style={{ '--columns': zone.cells.length }}>
          {zone.cells.map(([label]) => <div className="zone-column" key={`head-${label}`}>{label}</div>)}
          {zone.cells.map(([label, value], index) => (
            <div className="zone-cell" key={`${run}-${label}`} aria-label={`${label}: ${value}`}>
              <span className="empty-mark" aria-hidden="true">···</span>
              <span className="cell-value" style={{ '--cell-delay': `${index * 110}ms` }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ZoneMap() {
  const items = [
    ['data', 'Datos', 'Información del ejercicio'],
    ['entry', 'Compras', 'Se anotan en Entrada'],
    ['exit', 'Ventas', 'Se anotan en Salida'],
    ['stock', 'Existencia', 'Se actualiza siempre'],
    ['unit', 'Precio unitario', 'Se identifica en celeste'],
    ['calculation', 'Cuentas', 'Operaciones y resultados'],
  ]
  return (
    <div className="zone-map">
      {items.map(([type, title, description]) => (
        <div className={`map-item zone-${type}`} style={{ '--zone-color': roleMeta[type].color }} key={type}>
          <span>{roleMeta[type].label}</span><strong>{title}</strong><p>{description}</p>
        </div>
      ))}
    </div>
  )
}

function FullTableView({ method, current, tableRows, onBack, onClose }) {
  const viewportRef = useRef(null)
  const tableRef = useRef(null)
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)
  const viewRef = useRef({ scale: 1, x: 0, y: 0, fit: 1 })
  const [view, setView] = useState(viewRef.current)
  const rows = tableRows
  const currentRow = current > 0 ? Math.floor((current - 1) / 3) : -1
  const currentStage = current > 0 ? ((current - 1) % 3) + 1 : 0
  const currentGroup = currentStage === 1 ? 'data' : currentStage === 2 ? rows[currentRow]?.operation : currentStage === 3 ? 'stock' : null
  const currentMeta = currentGroup ? roleMeta[currentGroup] : null

  const commitView = (nextView) => {
    viewRef.current = nextView
    setView(nextView)
  }

  const fitTable = () => {
    const viewport = viewportRef.current
    const table = tableRef.current
    if (!viewport || !table) return
    const viewportBox = viewport.getBoundingClientRect()
    const tableWidth = table.offsetWidth
    const tableHeight = table.offsetHeight
    if (!tableWidth || !tableHeight) return
    const fit = Math.min((viewportBox.width - 24) / tableWidth, (viewportBox.height - 24) / tableHeight, 1)
    commitView({
      scale: fit,
      fit,
      x: (viewportBox.width - tableWidth * fit) / 2,
      y: (viewportBox.height - tableHeight * fit) / 2,
    })
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(fitTable)
    const observer = new ResizeObserver(fitTable)
    if (viewportRef.current) observer.observe(viewportRef.current)
    if (tableRef.current) observer.observe(tableRef.current)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [method, current])

  const zoomAt = (requestedScale, clientX, clientY) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const previous = viewRef.current
    const minScale = previous.fit * .72
    const nextScale = Math.min(Math.max(requestedScale, minScale), 3.2)
    const bounds = viewport.getBoundingClientRect()
    const centerX = clientX === undefined ? bounds.width / 2 : clientX - bounds.left
    const centerY = clientY === undefined ? bounds.height / 2 : clientY - bounds.top
    const worldX = (centerX - previous.x) / previous.scale
    const worldY = (centerY - previous.y) / previous.scale
    commitView({ ...previous, scale: nextScale, x: centerX - worldX * nextScale, y: centerY - worldY * nextScale })
  }

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointersRef.current.values()]
    if (points.length === 1) {
      gestureRef.current = { type: 'pan', point: points[0], view: viewRef.current }
    } else if (points.length === 2) {
      const [first, second] = points
      gestureRef.current = {
        type: 'pinch',
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
        view: viewRef.current,
      }
    }
  }

  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointersRef.current.values()]
    const gesture = gestureRef.current
    if (!gesture) return
    if (points.length === 2 && gesture.type === 'pinch') {
      const [first, second] = points
      const distance = Math.hypot(second.x - first.x, second.y - first.y)
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
      const bounds = viewportRef.current.getBoundingClientRect()
      const startCenterX = gesture.center.x - bounds.left
      const startCenterY = gesture.center.y - bounds.top
      const nextCenterX = center.x - bounds.left
      const nextCenterY = center.y - bounds.top
      const scale = Math.min(Math.max(gesture.view.scale * (distance / Math.max(gesture.distance, 1)), gesture.view.fit * .72), 3.2)
      const worldX = (startCenterX - gesture.view.x) / gesture.view.scale
      const worldY = (startCenterY - gesture.view.y) / gesture.view.scale
      commitView({ ...gesture.view, scale, x: nextCenterX - worldX * scale, y: nextCenterY - worldY * scale })
    } else if (points.length === 1 && gesture.type === 'pan') {
      const point = points[0]
      commitView({ ...gesture.view, x: gesture.view.x + point.x - gesture.point.x, y: gesture.view.y + point.y - gesture.point.y })
    }
  }

  const handlePointerEnd = (event) => {
    pointersRef.current.delete(event.pointerId)
    const points = [...pointersRef.current.values()]
    gestureRef.current = points.length === 1 ? { type: 'pan', point: points[0], view: viewRef.current } : null
  }

  const groupIsReached = (rowIndex, row, groupKey) => {
    if (currentRow < 0 || rowIndex > currentRow) return false
    if (rowIndex < currentRow) return true
    if (groupKey === 'data') return currentStage >= 1
    if (groupKey === row.operation) return currentStage >= 2
    if (groupKey === 'stock') return currentStage >= 3
    return false
  }

  return (
    <section className="table-modal full-table-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="full-table-title">
      <div className="modal-heading full-table-heading">
        <div><span>Ficha {method}</span><h2 id="full-table-title">Tabla completa</h2></div>
        <button className="close-button" onClick={onClose} aria-label="Cerrar tabla completa">×</button>
      </div>
      <div className="full-table-toolbar">
        <button className="back-to-crop" onClick={onBack} aria-label="Volver al recorte"><ArrowIcon direction="left" /><span>Volver al recorte</span></button>
        <p className="current-completion" style={{ '--current-color': currentMeta?.color || '#d7dcda' }} aria-live="polite">
          <i aria-hidden="true" />
          {currentMeta ? <>Completado en este paso: <strong>{currentMeta.label} · {rows[currentRow].code}</strong></> : 'La guía todavía no completa ninguna celda.'}
        </p>
        <div className="zoom-controls" role="group" aria-label="Controles de zoom">
          <button onClick={() => zoomAt(view.scale / 1.25)} aria-label="Alejar tabla">−</button>
          <output aria-label="Nivel de zoom">{Math.round(view.scale * 100)}%</output>
          <button onClick={() => zoomAt(view.scale * 1.25)} aria-label="Acercar tabla">+</button>
          <button className="fit-table-button" onClick={fitTable}>Ajustar</button>
        </div>
      </div>
      <div
        className="full-table-viewport"
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={(event) => { event.preventDefault(); zoomAt(viewRef.current.scale * (event.deltaY > 0 ? .9 : 1.1), event.clientX, event.clientY) }}
        role="region"
        aria-label="Tabla ampliable. Pellizcá con dos dedos para acercar o alejar y arrastrá para moverla."
      >
        <table
          className="complete-stock-table"
          ref={tableRef}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <caption>Ficha de stock {method}, movimientos {rows.map((row) => row.code).join(', ')}</caption>
          <colgroup>
            <col className="col-movement" />
            <col className="col-date" /><col className="col-detail" />
            <col className="col-quantity" /><col className="col-unit" /><col className="col-total" />
            <col className="col-quantity" /><col className="col-unit" /><col className="col-total" />
            <col className="col-quantity" /><col className="col-unit" /><col className="col-total" />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan="2" scope="col">Mov.</th>
              {fullTableGroups.map((group) => <th className={`group-heading group-${group.key}`} style={{ '--group-color': roleMeta[group.key].color }} colSpan={group.columns.length} scope="colgroup" key={group.key}>{group.label}</th>)}
            </tr>
            <tr>
              {fullTableGroups.flatMap((group) => group.columns.map(([, label]) => <th className={`column-heading group-${group.key}`} style={{ '--group-color': roleMeta[group.key].color }} scope="col" key={`${group.key}-${label}`}>{label}</th>))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowStarted = currentRow >= rowIndex
              return (
                <tr key={row.code}>
                  <th scope="row"><span className="movement-code">{row.code}</span></th>
                  {fullTableGroups.flatMap((group) => {
                    const reached = groupIsReached(rowIndex, row, group.key)
                    const applicable = group.key === 'data' || group.key === 'stock' || group.key === row.operation
                    const isCurrent = rowIndex === currentRow && group.key === currentGroup
                    return group.columns.map(([field, label]) => {
                      const value = row[group.key]?.[field]
                      const shownValue = reached && value ? value : !applicable && rowStarted ? '—' : ''
                      const stateClass = !applicable && rowStarted ? 'is-not-applicable' : isCurrent ? 'is-current-step' : reached ? 'is-completed' : 'is-pending'
                      const accessibleValue = shownValue || 'Pendiente'
                      return <td className={`${stateClass} group-${group.key}`} style={{ '--cell-color': roleMeta[group.key].color }} aria-label={`${row.code}, ${group.label}, ${label}: ${accessibleValue}`} key={`${row.code}-${group.key}-${field}`}><span>{shownValue}</span></td>
                    })
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="pinch-hint">Pellizcá para ampliar · Arrastrá para mover</p>
      </div>
    </section>
  )
}

function TableModal({ lesson, method, current, tableRows, onClose }) {
  const [run, setRun] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [showFullTable, setShowFullTable] = useState(false)

  useEffect(() => {
    setReveal(false)
    const timer = window.setTimeout(() => setReveal(true), 720)
    return () => window.clearTimeout(timer)
  }, [lesson, run])

  const transitionRole = lesson.zones.length ? zoneMeta[lesson.zones[lesson.zones.length - 1].type] : roleMeta[lesson.role]

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose} role="presentation">
      {showFullTable ? <FullTableView method={method} current={current} tableRows={tableRows} onBack={() => setShowFullTable(false)} onClose={onClose} /> : (
      <section className={`table-modal ${lesson.zones.length === 2 ? 'has-two-zones' : ''}`} style={{ '--transition-color': transitionRole.color }} onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="table-title">
        <div className="modal-heading">
          <div><span>{lesson.phase}</span><h2 id="table-title">Así queda en la tabla</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Cerrar tabla">×</button>
        </div>
        {lesson.zones.length ? (
          <>
            <div className={`transition-status ${reveal ? 'is-complete' : ''}`} aria-live="polite">
              <span><i aria-hidden="true" />{reveal ? 'Dato agregado en la zona marcada' : 'Primero: la fila está vacía'}</span>
              <button onClick={() => setRun((value) => value + 1)}><ReplayIcon />Repetir</button>
            </div>
            <div className="zone-stack">
              {lesson.zones.map((item, index) => <ZoneCrop zone={item} reveal={reveal} run={run} key={`${item.type}-${index}`} />)}
            </div>
          </>
        ) : <ZoneMap />}
        <div className="modal-footer">
          <p className="modal-caption"><i aria-hidden="true" />Este recorte mantiene el texto grande.</p>
          <button className="open-full-table" onClick={() => setShowFullTable(true)}>Ver tabla completa</button>
        </div>
      </section>
      )}
    </div>
  )
}

function HomeScreen({ savedRows, onOpenExample, onOpenBuilder }) {
  return (
    <main className="welcome-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <section className="welcome-card" aria-labelledby="welcome-title">
        <span className="welcome-kicker">Aprendé paso a paso</span>
        <div className="welcome-copy">
          <h1 id="welcome-title">Elegí PEPS o UEPS</h1>
          <p>Cada opción abre un ejemplo completo para recorrer con tarjetas.</p>
        </div>
        <div className="method-cards" role="group" aria-label="Elegir flujo inicial">
          <button onClick={() => onOpenExample('PEPS')}>
            <span>P</span><div><strong>PEPS</strong><small>Abrir ejemplo</small></div><ArrowIcon direction="right" />
          </button>
          <button onClick={() => onOpenExample('UEPS')}>
            <span>U</span><div><strong>UEPS</strong><small>Abrir ejemplo</small></div><ArrowIcon direction="right" />
          </button>
        </div>
        <div className="welcome-divider"><span>o</span></div>
        <button className="load-data-button" onClick={onOpenBuilder}><TableIcon /><span>Cargar datos</span></button>
        <p className="saved-exercise-note" aria-live="polite">{savedRows ? `Tenés ${savedRows} ${savedRows === 1 ? 'fila guardada' : 'filas guardadas'} en este dispositivo.` : 'También podés crear un ejercicio con tus propios datos.'}</p>
      </section>
    </main>
  )
}

function DataBuilder({ rows, method, onMethodChange, onRowsChange, onLoad, onBack }) {
  const [draft, setDraft] = useState(EMPTY_ROW)
  const [error, setError] = useState('')
  const visibleRows = rows.slice(-2)

  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
    if (error) setError('')
  }

  const addRow = (event) => {
    event.preventDefault()
    const code = draft.code.trim().toLocaleUpperCase('es')
    const date = draft.date.trim()
    const detail = draft.detail.trim()
    const quantity = parseLocalizedNumber(draft.quantity)
    const unitPrice = parseLocalizedNumber(draft.unitPrice)

    if (!code || !date || !detail) return setError('Completá la letra, la fecha y el comprobante.')
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) return setError('Cantidad y monto deben ser números mayores que cero.')
    if (rows.some((row) => row.code.toLocaleUpperCase('es') === code)) return setError(`La letra ${code} ya está usada.`)
    const available = rows.reduce((stock, row) => stock + (row.operation === 'entry' ? row.quantity : -row.quantity), 0)
    if (draft.operation === 'exit' && quantity > available) return setError(`Solo hay ${formatQuantity(available)} unidades disponibles para vender.`)

    onRowsChange([...rows, { code, date, detail, operation: draft.operation, quantity, unitPrice }])
    setDraft((currentDraft) => ({ ...EMPTY_ROW, operation: currentDraft.operation }))
    setError('')
  }

  const loadExercise = () => {
    const validationError = onLoad()
    if (validationError) setError(validationError)
  }

  return (
    <main className="builder-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="builder-topbar">
        <button className="builder-back" onClick={onBack} aria-label="Volver a la pantalla inicial"><ArrowIcon direction="left" /></button>
        <div><span>Nuevo ejercicio</span><h1>Cargar datos</h1></div>
        <strong>{rows.length} {rows.length === 1 ? 'fila' : 'filas'}</strong>
      </header>
      <form className="builder-card" onSubmit={addRow} noValidate>
        <fieldset className="builder-method">
          <legend>Método para resolver</legend>
          <div>
            {['PEPS', 'UEPS'].map((option) => <button type="button" className={method === option ? 'active' : ''} aria-pressed={method === option} onClick={() => onMethodChange(option)} key={option}>{option}</button>)}
          </div>
        </fieldset>
        <div className="builder-fields">
          <label><span>Letra de fila</span><input value={draft.code} onChange={(event) => updateDraft('code', event.target.value)} placeholder="O" maxLength="3" autoCapitalize="characters" /></label>
          <label><span>Fecha</span><input value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} placeholder="3/05" inputMode="numeric" /></label>
          <label className="detail-field"><span>Comprobante</span><input value={draft.detail} onChange={(event) => updateDraft('detail', event.target.value)} placeholder="FD N.º 2345" /></label>
        </div>
        <fieldset className="operation-picker">
          <legend>Elegir movimiento</legend>
          <div>
            <button type="button" className={draft.operation === 'entry' ? 'active entry-choice' : 'entry-choice'} aria-pressed={draft.operation === 'entry'} onClick={() => updateDraft('operation', 'entry')}>Compra</button>
            <span aria-hidden="true">|</span>
            <button type="button" className={draft.operation === 'exit' ? 'active exit-choice' : 'exit-choice'} aria-pressed={draft.operation === 'exit'} onClick={() => updateDraft('operation', 'exit')}>Venta</button>
          </div>
        </fieldset>
        <div className="amount-fields">
          <label><span>Cantidad</span><input value={draft.quantity} onChange={(event) => updateDraft('quantity', event.target.value)} placeholder="950" inputMode="decimal" /></label>
          <label><span>Monto $ <small>por unidad</small></span><input value={draft.unitPrice} onChange={(event) => updateDraft('unitPrice', event.target.value)} placeholder="110" inputMode="decimal" /></label>
        </div>
        <button className="add-row-button" style={{ '--add-color': draft.operation === 'entry' ? roleMeta.entry.color : roleMeta.exit.color }} type="submit">Agregar fila</button>
        <section className="added-rows" aria-labelledby="added-rows-title">
          <div><strong id="added-rows-title">Filas agregadas</strong>{rows.length > 2 && <small>Últimas 2 de {rows.length}</small>}</div>
          {visibleRows.length ? <ol>{visibleRows.map((row) => (
            <li key={row.code}>
              <span className={row.operation === 'entry' ? 'row-operation entry' : 'row-operation exit'}>{row.operation === 'entry' ? 'Compra' : 'Venta'}</span>
              <strong>{row.code} · {row.date}</strong>
              <span>{formatQuantity(row.quantity)} × {formatMoney(row.unitPrice)}</span>
              <button type="button" onClick={() => onRowsChange(rows.filter((item) => item.code !== row.code))} aria-label={`Eliminar fila ${row.code}`}>×</button>
            </li>
          ))}</ol> : <p>Todavía no agregaste filas.</p>}
        </section>
        <p className={error ? 'builder-error visible' : 'builder-error'} role={error ? 'alert' : undefined}>{error || 'Los datos se guardan automáticamente en este dispositivo.'}</p>
        <button className="start-exercise-button" type="button" onClick={loadExercise}>Cargar</button>
      </form>
    </main>
  )
}

function App() {
  const [savedExercise] = useState(readSavedExercise)
  const [screen, setScreen] = useState('home')
  const [flowType, setFlowType] = useState('example')
  const [method, setMethod] = useState('UEPS')
  const [builderMethod, setBuilderMethod] = useState(savedExercise.method)
  const [customRows, setCustomRows] = useState(savedExercise.rows)
  const [current, setCurrent] = useState(0)
  const [openLayer, setOpenLayer] = useState(null)
  const customFlow = useMemo(() => {
    if (flowType !== 'custom' || screen !== 'lesson' || validateExerciseRows(customRows)) return null
    return buildExerciseFlow(method, customRows)
  }, [customRows, flowType, method, screen])
  const flow = flowType === 'custom' && customFlow ? customFlow : { lessons: lessonsByMethod[method], tableRows: fullTableByMethod[method], chapters }
  const { lessons, tableRows, chapters: flowChapters } = flow
  const lesson = lessons[current]
  const otherMethod = method === 'UEPS' ? 'PEPS' : 'UEPS'

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, method: builderMethod, rows: customRows }))
    } catch {
      // La app sigue funcionando aunque el navegador bloquee el almacenamiento local.
    }
  }, [builderMethod, customRows])

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpenLayer(null)
      if (openLayer || screen !== 'lesson') return
      if (event.key === 'ArrowRight') setCurrent((value) => Math.min(value + 1, lessons.length - 1))
      if (event.key === 'ArrowLeft') setCurrent((value) => Math.max(value - 1, 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lessons.length, openLayer, screen])

  useEffect(() => {
    document.title = screen === 'home' ? 'PEPS y UEPS visual' : screen === 'builder' ? 'Cargar ejercicio | PEPS y UEPS visual' : `${method} visual | Instructivo paso a paso`
  }, [method, screen])

  const goTo = (index) => { setCurrent(index); setOpenLayer(null) }
  const switchMethod = () => {
    setMethod(otherMethod)
    if (flowType === 'custom') setBuilderMethod(otherMethod)
    setCurrent(0)
    setOpenLayer(null)
  }

  const openExample = (selectedMethod) => {
    setMethod(selectedMethod)
    setFlowType('example')
    setCurrent(0)
    setOpenLayer(null)
    setScreen('lesson')
  }

  const loadCustomExercise = () => {
    const error = validateExerciseRows(customRows)
    if (error) return error
    setMethod(builderMethod)
    setFlowType('custom')
    setCurrent(0)
    setOpenLayer(null)
    setScreen('lesson')
    return ''
  }

  if (screen === 'home') return <HomeScreen savedRows={customRows.length} onOpenExample={openExample} onOpenBuilder={() => setScreen('builder')} />
  if (screen === 'builder') return <DataBuilder rows={customRows} method={builderMethod} onMethodChange={setBuilderMethod} onRowsChange={setCustomRows} onLoad={loadCustomExercise} onBack={() => setScreen('home')} />

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <button className="top-action menu-button" onClick={() => setOpenLayer('index')} aria-label="Abrir índice" aria-expanded={openLayer === 'index'}><MenuIcon /><span>Índice</span></button>
        <button className="brand" onClick={() => { setOpenLayer(null); setScreen('home') }} aria-label="Volver a la pantalla inicial"><span>{method[0]}</span><strong>{method} visual</strong></button>
        <button className="top-action method-switch" onClick={switchMethod} aria-label={`Cambiar a ${otherMethod}`}><span>Cambiar a</span><strong>{otherMethod}</strong></button>
      </header>
      <section className="stage" aria-label={`Instructivo de ${method}`}><LessonCard lesson={lesson} current={current} total={lessons.length} onOpenTable={() => setOpenLayer('table')} /></section>
      <footer className="lesson-nav">
        <button aria-label="Anterior" onClick={() => setCurrent((value) => Math.max(value - 1, 0))} disabled={current === 0}><ArrowIcon direction="left" /><span>Anterior</span></button>
        <div className="progress" aria-label={`Paso ${current + 1} de ${lessons.length}`}>{lessons.map((item, index) => <i key={`${item.chapter}-${index}`} className={index === current ? 'active' : ''} />)}</div>
        <button aria-label="Siguiente" onClick={() => setCurrent((value) => Math.min(value + 1, lessons.length - 1))} disabled={current === lessons.length - 1}><span>Siguiente</span><ArrowIcon direction="right" /></button>
      </footer>
      {openLayer === 'index' && <LessonIndex current={current} method={method} flowChapters={flowChapters} onSelect={goTo} onClose={() => setOpenLayer(null)} />}
      {openLayer === 'table' && <TableModal lesson={lesson} method={method} current={current} tableRows={tableRows} onClose={() => setOpenLayer(null)} />}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
