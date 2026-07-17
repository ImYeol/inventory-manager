# ADR-019: page-level self-themed UI를 금지하고 shared primitive variant로 올린다
**결정**: 페이지 안에서 inline style이나 ad-hoc class 조합으로 새로운 색상/보더/배경 언어를 만들지 않는다. 필요한 시맨틱은 shared primitive variant와 design token에 먼저 추가한다.  
**이유**: inventory toolbar처럼 같은 의미의 액션이 페이지별로 다른 inline style을 쓰기 시작하면 디자인 시스템이 깨지고, hooks가 검출할 수 있는 기준도 약해진다.  
**트레이드오프**: 간단한 화면 수정도 먼저 primitive 계층을 손봐야 할 수 있지만, 전체 surface의 일관성은 유지된다.

