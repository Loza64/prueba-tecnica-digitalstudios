import { useState, type FormEvent } from 'react'
import { PlanillaDetalle } from './features/PlanillaDetalle'

const leerId = () => {
  const n = Number(new URLSearchParams(location.search).get('id'))
  return Number.isInteger(n) && n > 0 ? n : 1
}

export default function App() {
  const [id, setId] = useState(leerId)

  function irAPlanilla(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = Number(new FormData(e.currentTarget).get('id'))
    if (!Number.isInteger(value) || value < 1) {
      return
    }
    setId(value)
    history.replaceState(null, '', `?id=${value}`)
  }

  return (
    <>
      <form className="selector" onSubmit={irAPlanilla}>
        <label htmlFor="planilla-id">Planilla n.º</label>
        <input
          id="planilla-id"
          name="id"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={id}
          key={id}
        />
        <button type="submit" className="btn btn-secundario">
          Ver
        </button>
      </form>
      <main>
        <PlanillaDetalle key={id} id={id} />
      </main>
    </>
  )
}
