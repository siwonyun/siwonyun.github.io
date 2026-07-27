---
layout: default
title: "Style test"
nav:
  - title: Home
    url: /
  - title: Notes
    url: /bcsc_memory_CN/
  - title: Style test
    url: /styleguide.html
---

# Style test

latex.css에서 가져온 요소만 확인하는 페이지. 필요 없으면 이 파일을 지워라.

## Math
### Subtitle
#### Subsub

수식은 마크다운에서 `$$...$$`로 쓴다. 인라인 `$` 하나는 쓰지 않는다. kramdown이
`$$...$$` 안쪽을 마크다운으로 해석하지 않기 때문에 `_`, `\\`, `*`를 그대로 넣을 수 있고,
문장 중간에 있으면 인라인, 문단 하나를 혼자 차지하면 디스플레이로 자동 판정된다.
렌더링은 KaTeX가 한다.

문장 중간의 인라인 수식: 학습률 $$\eta$$가 충분히 작으면 $$x_{t+1} = x_t - \eta \nabla f(x_t)$$는
$$f$$의 값을 감소시킨다. 아래는 같은 내용을 디스플레이로 쓴 것이다.

$$
\nabla f(x_t) = \left. \frac{\partial f}{\partial x} \right|_{x = x_t}
$$

여러 줄을 정렬할 때는 `aligned`를 쓴다. 줄바꿈은 `\\`, 정렬 기준은 `&`다.

$$
\begin{aligned}
  \mathcal{L}(\theta)
    &= -\frac{1}{N} \sum_{i=1}^{N} \log p_\theta(y_i \mid x_i) \\
    &= -\frac{1}{N} \sum_{i=1}^{N} \left[ y_i \log \hat{y}_i + (1 - y_i) \log (1 - \hat{y}_i) \right]
\end{aligned}
$$

경우를 나눌 때는 `cases`, 행렬은 `pmatrix`·`bmatrix`를 쓴다.

$$
\mathrm{ReLU}(x) =
\begin{cases}
  x & x > 0 \\
  0 & x \le 0
\end{cases}
\qquad
W =
\begin{bmatrix}
  w_{11} & w_{12} \\
  w_{21} & w_{22}
\end{bmatrix}
$$

긴 수식은 KaTeX가 등호와 이항연산자에서 알아서 줄을 바꾼다. 행렬처럼 끊을 자리가 없어
그래도 넘치면 본문을 밀지 않고 그 줄만 좌우로 스크롤된다.

$$
p(x_{1:T}) = p(x_1) \prod_{t=2}^{T} p(x_t \mid x_{t-1}) = p(x_1) \prod_{t=2}^{T} \frac{\exp\left(-\beta E(x_t, x_{t-1})\right)}{\sum_{x'} \exp\left(-\beta E(x', x_{t-1})\right)}
$$

`<div class="theorem">`처럼 HTML 블록 안은 kramdown이 건드리지 않으므로 `$$` 대신
`\(...\)`(인라인), `\[...\]`(디스플레이)를 직접 쓴다.

<div class="theorem">
  \(\mu_\theta\)가 환경 분포 \(\rho\)에 대해 불변이면 \[\int \mu_\theta(x) \, \rho(dx) = \mu_\theta.\]
</div>

## Lists

itemize는 3중까지 LaTeX와 같은 순서(&bull;, &ndash;, &lowast;)로 마커가 바뀐다.
하위 항목은 공백 2칸으로 들여쓴다.

- Type I Learning
  - 파라미터 갱신 없음
    - 동역학만으로 적응
    - 불변측도가 환경에 의존
  - 고정 가중치 신경망
- Type II Learning
  - 파라미터 갱신 있음
    - 경사하강
      - 4중부터는 &lowast;가 유지된다

enumerate도 3중까지 1. → a. → i. 순서로 바뀐다.

1. 관찰
   1. 자극 제시
      1. 시행 간 간격 고정
      2. 순서 무작위화
   2. 반응 기록
2. 해석

번호와 기호를 섞어도 되고, 항목 안에 수식을 넣어도 된다.

- 수렴 조건
  1. 학습률의 합이 발산할 것: $$\sum_t \eta_t = \infty$$
  2. 제곱합은 수렴할 것: $$\sum_t \eta_t^2 < \infty$$

  항목 내용이 수식뿐이면 kramdown이 디스플레이로 판정해 가운데 정렬되므로,
  인라인으로 두려면 앞에 설명을 붙인다.

## Table

| Method | Accuracy | Notes |
|---|---|---|
| Baseline | 0.71 | reference |
| Ours | 0.88 | best |

## Footnote

본문에 각주를 단다.[^one] 두 번째 각주도 단다.[^two]

[^one]: 첫 번째 각주 내용.
[^two]: 두 번째 각주 내용.

## Theorem / Proof

<div class="theorem">
  고정 가중치 신경망도 환경 의존적 불변측도로 수렴한다.
</div>

<div class="proof">
  자명하다.
</div>

<div class="definition">
  Type I Learning은 파라미터 갱신 없이 동역학만으로 적응이 발생하는 경우를 말한다.
</div>

## Figure caption

번호는 `figure`의 `counter-increment`로 센다. `<div>`로 감싸면 카운터가 안 돌아
`Figure 0.`이 되고, 이미지만 따로 가운데 정렬하면 캡션은 왼쪽에 남는다.

<figure>
  <img src="https://placehold.co/480x120/eeeeee/333333.png?text=figure" alt="placeholder">
  <figcaption>자동으로 번호가 붙는 캡션.</figcaption>
</figure>

## Sidenote

이 문장에 사이드노트를 단다.<label for="sn-1" class="sidenote-toggle sidenote-number"></label><input type="checkbox" id="sn-1" class="sidenote-toggle"><span class="sidenote">여백에 표시되는 노트. 화면이 좁으면 접힌다.</span>
