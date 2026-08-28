const zone = (type, row, cells) => ({ type, row, cells })

const quantityFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })
const moneyFormatter = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export const formatQuantity = (value) => quantityFormatter.format(value)
export const formatMoney = (value) => `$${moneyFormatter.format(value)}`

export function parseLocalizedNumber(value) {
  const clean = String(value).replace(/[$\s]/g, '')
  if (!clean) return Number.NaN
  if (clean.includes(',') && clean.includes('.')) return Number(clean.replace(/\./g, '').replace(',', '.'))
  if (clean.includes(',')) return Number(clean.replace(',', '.'))
  if (/^\d{1,3}(\.\d{3})+$/.test(clean)) return Number(clean.replace(/\./g, ''))
  return Number(clean)
}

function stockSnapshot(lots) {
  const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  const total = lots.reduce((sum, lot) => sum + lot.quantity * lot.unitPrice, 0)
  const unit = lots.length
    ? lots.map((lot) => `${formatQuantity(lot.quantity)} a ${formatMoney(lot.unitPrice)}`).join('\n')
    : 'Sin existencia'
  return { quantity, total, unit }
}

function useLots(lots, requestedQuantity, method) {
  const updatedLots = lots.map((lot) => ({ ...lot }))
  const allocations = []
  let remaining = requestedQuantity

  while (remaining > 0) {
    const lotIndex = method === 'PEPS' ? 0 : updatedLots.length - 1
    const lot = updatedLots[lotIndex]
    if (!lot) throw new Error('La venta supera la existencia disponible.')
    const quantity = Math.min(remaining, lot.quantity)
    allocations.push({ quantity, unitPrice: lot.unitPrice, total: quantity * lot.unitPrice })
    lot.quantity -= quantity
    remaining -= quantity
    if (lot.quantity === 0) updatedLots.splice(lotIndex, 1)
  }

  return { lots: updatedLots, allocations }
}

export function validateExerciseRows(rows) {
  if (!rows.length) return 'Agregá al menos una fila antes de cargar el ejercicio.'
  let stock = 0
  const letters = new Set()

  for (const row of rows) {
    if (!row.code || !row.date || !row.detail) return 'Todas las filas necesitan letra, fecha y comprobante.'
    if (!Number.isFinite(row.quantity) || row.quantity <= 0 || !Number.isFinite(row.unitPrice) || row.unitPrice <= 0) return `Revisá la cantidad y el monto de la fila ${row.code}.`
    if (letters.has(row.code.toLocaleUpperCase('es'))) return `La letra ${row.code} está repetida.`
    letters.add(row.code.toLocaleUpperCase('es'))
    stock += row.operation === 'entry' ? row.quantity : -row.quantity
    if (stock < 0) return `La venta de la fila ${row.code} supera la existencia disponible.`
  }

  return ''
}

function guideLesson(method) {
  const isPeps = method === 'PEPS'
  return {
    chapter: 'Guía',
    role: 'calculation',
    phase: 'Antes de empezar',
    title: `Cómo resolver tu ejercicio con ${method}`,
    intro: isPeps ? 'Primero en entrar, primero en salir.' : 'Último en entrar, primero en salir.',
    facts: [
      ['Ejercicio cargado', 'Cada movimiento se divide en tres pasos cortos.'],
      ['Regla principal', isPeps ? 'En una venta usamos primero el lote más antiguo.' : 'En una venta usamos primero el lote más nuevo.'],
    ],
    formula: [method, isPeps ? 'PRIMERO EN ENTRAR' : 'ÚLTIMO EN ENTRAR', 'PRIMERO EN SALIR'],
    formulaRoles: ['calculation', 'calculation'],
    note: 'El monto de una venta no es el costo de salida: el costo se obtiene de los lotes guardados.',
    zones: [],
  }
}

function dataLesson(row) {
  const isEntry = row.operation === 'entry'
  const operationText = isEntry ? 'compramos' : 'vendemos'
  const destination = isEntry ? 'ENTRADA' : 'SALIDA'
  return {
    chapter: row.code,
    role: 'data',
    phase: `${row.code} · Paso 1 de 3`,
    title: `Ubicar los datos de la ${isEntry ? 'compra' : 'venta'}`,
    intro: `El ${row.date} ${operationText} ${formatQuantity(row.quantity)} unidades a ${formatMoney(row.unitPrice)} cada una, según ${row.detail}.`,
    facts: [['Fecha', row.date], ['Detalle', row.detail]],
    formula: ['Palabra clave', isEntry ? 'COMPRA' : 'VENTA', destination],
    formulaRoles: ['data', isEntry ? 'entry' : 'exit'],
    note: `Primero abrimos la fila ${row.code} y completamos la zona Datos.`,
    zones: [zone('data', `Fila nueva · ${row.code}`, [['Fecha', row.date], ['Detalle', row.detail]])],
  }
}

function entryLesson(row) {
  const total = row.quantity * row.unitPrice
  return {
    chapter: row.code,
    role: 'entry',
    phase: `${row.code} · Paso 2 de 3`,
    title: 'Completar la entrada',
    intro: 'Copiamos la cantidad y el precio unitario del ejercicio.',
    facts: [['Cantidad', `${formatQuantity(row.quantity)} unidades`], ['Precio unitario', formatMoney(row.unitPrice)]],
    formula: ['Precio total', `${formatQuantity(row.quantity)} × ${formatMoney(row.unitPrice)}`, formatMoney(total)],
    formulaRoles: ['calculation', 'calculation'],
    note: 'La compra entra como un lote separado y conserva su propio costo.',
    zones: [zone('entry', `Fila ${row.code} · ${row.date}`, [['Cantidad', formatQuantity(row.quantity)], ['Precio unitario', formatMoney(row.unitPrice)], ['Precio total', formatMoney(total)]])],
  }
}

function exitLesson(row, allocations, method) {
  const total = allocations.reduce((sum, item) => sum + item.total, 0)
  const usedLots = allocations.map((item) => `${formatQuantity(item.quantity)} a ${formatMoney(item.unitPrice)}`).join('\n')
  const calculation = allocations.length <= 2
    ? allocations.map((item) => formatMoney(item.total)).join(' + ')
    : `${allocations.length} lotes sumados`
  return {
    chapter: row.code,
    role: 'exit',
    phase: `${row.code} · Paso 2 de 3`,
    title: `Resolver la salida con ${method}`,
    intro: method === 'PEPS' ? 'Usamos primero los lotes más antiguos.' : 'Usamos primero los lotes más nuevos.',
    facts: [['Cantidad que sale', `${formatQuantity(row.quantity)} unidades`], ['Costo por lotes', usedLots]],
    formula: ['Costo de salida', calculation, formatMoney(total)],
    formulaRoles: ['calculation', 'calculation'],
    note: 'El costo se calcula con la existencia anterior, no con el monto de venta.',
    zones: [zone('exit', `Fila ${row.code} · ${row.date}`, [['Cantidad', formatQuantity(row.quantity)], ['Precio unitario', usedLots], ['Precio total', formatMoney(total)]])],
  }
}

function stockLesson(row, stock) {
  return {
    chapter: row.code,
    role: 'stock',
    phase: `${row.code} · Paso 3 de 3`,
    title: 'Actualizar la existencia',
    intro: stock.quantity ? 'Anotamos los lotes que quedan después del movimiento.' : 'El movimiento deja la existencia en cero.',
    facts: [['Cantidad total', `${formatQuantity(stock.quantity)} unidades`], ['Lotes guardados', stock.unit]],
    formula: ['Valor de existencia', stock.unit, formatMoney(stock.total)],
    formulaRoles: ['stock', 'stock'],
    note: `La fila ${row.code} termina con ${formatQuantity(stock.quantity)} unidades por ${formatMoney(stock.total)}.`,
    zones: [zone('stock', `Fila ${row.code} · ${row.date}`, [['Cantidad', formatQuantity(stock.quantity)], ['Precio unitario', stock.unit], ['Precio total', formatMoney(stock.total)]])],
  }
}

export function buildExerciseFlow(method, rows) {
  const lessons = [guideLesson(method)]
  const tableRows = []
  const chapters = [{ code: 'Guía', title: 'Cómo resolver el ejercicio', start: 0, end: 0, role: 'calculation' }]
  let lots = []

  rows.forEach((row, index) => {
    const normalizedRow = { ...row, code: row.code.toLocaleUpperCase('es') }
    const entryTotal = normalizedRow.quantity * normalizedRow.unitPrice
    let exit = {}
    let allocations = []

    lessons.push(dataLesson(normalizedRow))
    if (normalizedRow.operation === 'entry') {
      lots = [...lots, { quantity: normalizedRow.quantity, unitPrice: normalizedRow.unitPrice }]
      lessons.push(entryLesson(normalizedRow))
    } else {
      const result = useLots(lots, normalizedRow.quantity, method)
      lots = result.lots
      allocations = result.allocations
      lessons.push(exitLesson(normalizedRow, allocations, method))
      exit = {
        quantity: formatQuantity(normalizedRow.quantity),
        unit: allocations.map((item) => `${formatQuantity(item.quantity)} a ${formatMoney(item.unitPrice)}`).join('\n'),
        total: formatMoney(allocations.reduce((sum, item) => sum + item.total, 0)),
      }
    }

    const stock = stockSnapshot(lots)
    lessons.push(stockLesson(normalizedRow, stock))
    tableRows.push({
      code: normalizedRow.code,
      operation: normalizedRow.operation,
      data: { date: normalizedRow.date, detail: normalizedRow.detail },
      entry: normalizedRow.operation === 'entry' ? { quantity: formatQuantity(normalizedRow.quantity), unit: formatMoney(normalizedRow.unitPrice), total: formatMoney(entryTotal) } : {},
      exit,
      stock: { quantity: formatQuantity(stock.quantity), unit: stock.unit, total: formatMoney(stock.total) },
    })
    const start = 1 + index * 3
    chapters.push({ code: normalizedRow.code, title: normalizedRow.operation === 'entry' ? 'Compra' : 'Venta', start, end: start + 2, role: normalizedRow.operation })
  })

  return { lessons, tableRows, chapters }
}
