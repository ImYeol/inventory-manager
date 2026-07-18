// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InventoryDataTable } from '@/components/ui/inventory-data-table'

afterEach(cleanup)

describe('inventory incoming link', () => {
  it('links positive canonical incoming quantity to sourcing arrivals', () => {
    render(React.createElement(InventoryDataTable, {
      visibleColumns: new Set(['modelName', 'incoming']),
      rows: [{ key: '1', modelName: 'LP01', skuOption: null, warehouseName: '오금동', onHand: 3, committed: 1, available: 2, incoming: 7, incomingHref: '/sourcing/arrivals', status: { label: '정상', variant: 'success' } }],
    }))
    expect(screen.getByRole('link', { name: '입고 예정 7개 보기' }).getAttribute('href')).toBe('/sourcing/arrivals')
  })
})
