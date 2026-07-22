'use client'

// AutoForm 필드 타입("string" | "textarea") -> 실제 입력 컴포넌트 매핑. 반드시
// 프로젝트의 semantic 토큰을 통과하는 컴포넌트(Input, ui.control)만 사용한다.
// 이 매핑은 AutoForm을 쓰는 모든 곳이 공유하는 어댑터이며, 개별 필드의
// fieldConfig 오버라이드가 아니다.

import { useRegister, type AutoFormFieldComponents, type AutoFormFieldProps } from '@autoform/react/react-hook-form'
import { Input } from '@/components/ui/input'
import { ui } from '@/app/components/ui'
import { cn } from '@/lib/utils'

function StringField({ path, id, inputProps }: AutoFormFieldProps) {
  const registered = useRegister(path.join('.'))
  return <Input id={id} {...registered} {...inputProps} />
}

function TextareaField({ path, id, inputProps }: AutoFormFieldProps) {
  const registered = useRegister(path.join('.'))
  return <textarea id={id} className={cn(ui.control, 'min-h-28 resize-y')} {...registered} {...inputProps} />
}

export const autoFormFieldComponents: AutoFormFieldComponents = {
  string: StringField,
  textarea: TextareaField,
}
