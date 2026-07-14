// @vitest-environment jsdom
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProductVariantCombobox } from '@/components/ui/product-variant-combobox'

describe('ProductVariantCombobox', () => {
  it('searches canonical variants and exposes both channel slots without free-text creation', () => {
    const onValueChange = vi.fn()
    render(React.createElement(ProductVariantCombobox, { 'aria-label': '상품 옵션', value: null, onValueChange, variants: [{ id: '1:11:21', modelId: 1, sizeId: 11, colorId: 21, modelName: 'LP01', sizeName: 'S', colorName: '네이비', sellerSku: 'LP01-NV-S', channels: { naver: 'active', coupang: 'unregistered' } }] }))
    fireEvent.click(screen.getByRole('combobox', { name: '상품 옵션' }))
    expect(screen.getByText('네이버 · 판매 중')).toBeTruthy()
    expect(screen.getByText('쿠팡 · 미등록')).toBeTruthy()
    expect(screen.queryByText(/새 상품/)).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: /LP01/ }))
    expect(onValueChange).toHaveBeenCalledWith('1:11:21')
  })
})
