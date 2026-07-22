'use client'

// AutoForm(zod 스키마 기반 자동 폼 생성기, 이슈 #31 실험)이 요구하는 레이아웃/래퍼
// 레이어. 필드 렌더 자체는 form-components.tsx가 담당하고, 여기서는 라벨·에러·폼
// 뼈대만 프로젝트의 semantic 토큰(ui.label 등, docs/design/tokens.md)을 통해 그린다.
// 필드별 커스터마이즈가 아니라 모든 AutoForm 사용처가 공유하는 어댑터이므로
// 이슈가 정한 "fieldConfig 커스텀 오버라이드" 집계 대상이 아니다.

import type { AutoFormUIComponents } from '@autoform/react/react-hook-form'
import { ui } from '@/app/components/ui'
import { cn } from '@/lib/utils'

export const autoFormUiComponents: AutoFormUIComponents = {
  Form: ({ className, ...props }) => <form className={cn('space-y-3', className)} {...props} />,

  FieldWrapper: ({ label, error, children, id }) => (
    <div className="space-y-1">
      <label htmlFor={id} className={ui.label}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-[color:var(--danger-foreground)]">
          {error}
        </p>
      ) : null}
    </div>
  ),

  ErrorMessage: ({ error }) => (
    <p role="alert" className="text-sm text-[color:var(--danger-foreground)]">
      {error}
    </p>
  ),

  // 등록 폼은 Modal footer가 아닌 AutoForm children에 자체 제출 버튼을 두므로
  // withSubmit(기본 제출 버튼)은 사용하지 않는다. 타입 계약 충족을 위한 최소 구현.
  SubmitButton: ({ children }) => (
    <button type="submit" className={cn(ui.button, ui.buttonPrimary)}>
      {children}
    </button>
  ),

  // 현재 등록 스키마는 중첩 object/array 필드가 없어 실사용되지 않는다. 인터페이스
  // 충족을 위한 최소 스텁.
  ObjectWrapper: ({ children }) => <div className="space-y-3">{children}</div>,
  ArrayWrapper: ({ children }) => <div className="space-y-2">{children}</div>,
  ArrayElementWrapper: ({ children }) => <div className="space-y-2">{children}</div>,
}
