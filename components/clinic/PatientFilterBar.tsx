'use client'

import { useEffect, useRef, useState } from 'react'
import React from 'react'
import { MailOpen } from 'lucide-react'
import { Ic } from './Ic'

export type FilterKey = 'todos' | 'atencion' | 'pending' | 'archivo'
export type SortKey   = 'last_seen' | 'name'

const SORT_LABELS: Record<SortKey, string> = {
  last_seen: 'Últ. registro',
  name:      'Nombre',
}

type TabDef = { k: FilterKey; n: string; icon: (p?: React.SVGProps<SVGSVGElement>) => JSX.Element; iconOnly?: boolean }

const FILTER_TABS: TabDef[] = [
  { k: 'todos',    n: 'Todos',              icon: Ic.grid              },
  { k: 'atencion', n: 'Requieren atención', icon: Ic.alert },
  { k: 'pending',  n: 'Pendientes',         icon: (p) => <MailOpen size={12} {...p} /> },
  { k: 'archivo',  n: 'Archivo',            icon: Ic.book              },
]

type Props = {
  filter:         FilterKey
  onFilterChange: (f: FilterKey) => void
  searchQuery:    string
  onSearchChange: (q: string) => void
  sortKey:        SortKey
  onSortChange:   (k: SortKey) => void
  counts:         Record<FilterKey, number>
}

export function PatientFilterBar({
  filter, onFilterChange,
  searchQuery, onSearchChange,
  sortKey, onSortChange,
  counts,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortOpen,   setSortOpen]   = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const sortRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        onSearchChange('')
        setSortOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSearchChange])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node))
        setSortOpen(false)
    }
    if (sortOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [sortOpen])

  return (
    <div
      style={{
        padding: '18px 40px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Tabs de filtro */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--ink-7)',
        }}
      >
        {FILTER_TABS.map((t, i) => {
          const active = filter === t.k
          const Icon   = t.icon
          return (
            <button
              key={t.k}
              onClick={() => onFilterChange(t.k)}
              title={t.iconOnly ? t.n : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                border: 'none',
                borderRight: i < FILTER_TABS.length - 1 ? '1px solid var(--ink-7)' : 'none',
                borderBottom: active ? '2px solid var(--signal)' : '2px solid transparent',
                marginBottom: -1,
                background: 'transparent',
                color: active ? 'var(--ink)' : 'var(--ink-4)',
                fontSize: 12,
                fontFamily: 'var(--f-sans)',
                fontWeight: active ? 500 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.12s',
              }}
            >
              <Icon width={12} height={12} />
              {!t.iconOnly && t.n}
              <span
                className="fk-mono"
                style={{
                  fontSize: 9,
                  color: active ? 'var(--signal)' : 'var(--ink-6)',
                }}
              >
                {counts[t.k]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Buscador + ordenar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Buscador */}
        {searchOpen ? (
          <div style={{ position: 'relative' }}>
            <Ic.search width={13} height={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none' }} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar paciente…"
              autoFocus
              style={{
                paddingLeft: 30,
                paddingRight: 10,
                paddingTop: 7,
                paddingBottom: 7,
                borderRadius: 8,
                border: '1px solid var(--ink-5)',
                background: '#fff',
                fontSize: 12,
                fontFamily: 'var(--f-sans)',
                color: 'var(--ink)',
                width: 200,
                outline: 'none',
              }}
              onBlur={() => { if (!searchQuery) setSearchOpen(false) }}
            />
          </div>
        ) : (
          <button
            onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50) }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid var(--ink-7)',
              background: '#fff',
              fontSize: 12,
              fontFamily: 'var(--f-sans)',
              color: 'var(--ink-3)',
              cursor: 'pointer',
            }}
          >
            <Ic.search width={13} height={13} />
            Buscar
            <span className="fk-mono" style={{ fontSize: 9, padding: '1px 5px', background: 'var(--paper-3)', borderRadius: 4, color: 'var(--ink-4)' }}>⌘K</span>
          </button>
        )}

        {/* Ordenar */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSortOpen((o) => !o)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${sortOpen ? 'var(--ink-4)' : 'var(--ink-7)'}`,
              background: '#fff',
              fontSize: 12,
              color: 'var(--ink-2)',
              cursor: 'pointer',
              fontFamily: 'var(--f-sans)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Ordenar: {SORT_LABELS[sortKey]} ▾
          </button>
          {sortOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: '#fff',
              border: '1px solid var(--ink-7)',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              minWidth: 180,
              zIndex: 50,
              overflow: 'hidden',
            }}>
              {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { onSortChange(k); setSortOpen(false) }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    background: sortKey === k ? 'var(--paper-2)' : 'transparent',
                    fontSize: 13,
                    fontFamily: 'var(--f-sans)',
                    color: sortKey === k ? 'var(--ink)' : 'var(--ink-3)',
                    cursor: 'pointer',
                    fontWeight: sortKey === k ? 500 : 400,
                  }}
                >
                  {label}
                  {sortKey === k && <span style={{ float: 'right', color: 'var(--signal)' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
