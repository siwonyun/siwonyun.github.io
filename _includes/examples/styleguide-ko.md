# Style Guide
> 나는 젤리가 없어도 달콤한 냄새가 나

## Math
### Subtitle

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
  \(f\)가 \([a, b]\)에서 연속이면 \[\int_a^b f(x) \, dx = F(b) - F(a)\] 를 만족하는 원시함수 \(F\)가 존재한다.
</div>

## Lists

itemize는 3중까지 LaTeX와 같은 순서(&bull;, &ndash;, &lowast;)로 마커가 바뀐다.
하위 항목은 공백 2칸으로 들여쓴다.

- 지도 학습
  - 분류
    - 이진 분류
    - 다중 분류
  - 회귀
- 비지도 학습
  - 군집화
    - 계층적 군집화
      - 4중부터는 &lowast;가 유지된다

enumerate도 3중까지 1. → a. → i. 순서로 바뀐다.

1. 준비
   1. 데이터 분할
      1. 학습셋
      2. 검증셋
   2. 전처리
2. 학습

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

표는 내용에 맞는 만큼만 넓어진다. 표 **바로 다음 줄**에 `{: .full-width }`를 적으면
본문 폭을 꽉 채운다. 빈 줄을 사이에 두면 kramdown이 무시한다.

| Method | Accuracy | Notes |
|---|---|---|
| Baseline | 0.71 | reference |
| Ours | 0.88 | best |
{: .full-width }

## Footnote

본문에 각주를 단다.[^one] 두 번째 각주도 단다.[^two]

[^one]: 첫 번째 각주 내용.
[^two]: 두 번째 각주 내용.

## Theorem / Proof

<div class="theorem">
  볼록함수의 국소최솟값은 전역최솟값이다.
</div>

<div class="proof">
  자명하다.
</div>

<div class="definition">
  함수 \(f\)가 볼록하다는 것은 모든 \(x, y\)와 \(\lambda \in [0, 1]\)에 대해
  \(f(\lambda x + (1 - \lambda) y) \le \lambda f(x) + (1 - \lambda) f(y)\)가 성립한다는 뜻이다.
</div>

## Figure caption

번호는 `figure`의 `counter-increment`로 센다. `<div>`로 감싸면 카운터가 안 돌아
`Figure 0.`이 되고, 이미지만 따로 가운데 정렬하면 캡션은 왼쪽에 남는다.

<figure>
  <img src="https://placehold.co/480x120/eeeeee/333333.png?text=figure" alt="placeholder">
  <figcaption>자동으로 번호가 붙는 캡션.</figcaption>
</figure>

## Sidenote

사이드노트는 태그 하나로 쓴다. 좁은 화면에서 접기 위한 label과 체크박스는
`site.js`가 붙이므로, 번호도 id도 직접 적지 않는다.

이 문장에 사이드노트를 단다.<span class="sn">여백에 표시되는 노트. 화면이 좁으면 접힌다. [링크](/)도 그대로 쓸 수 있다.</span>

그림이 들어가면 `{::nomarkdown}`으로 감싼다. kramdown이 span 문맥의 `<figcaption>`을
이스케이프하기 때문인데, 그 안에서는 마크다운이 꺼지므로 링크는 `<a>`로 적어야 한다.

{::nomarkdown}<figure class="sn"><img src="https://placehold.co/480x120/eeeeee/333333.png?text=sidenote" alt="placeholder"><figcaption>여백 그림.</figcaption></figure>{:/}
