---
layout: default
title: "BCSC: Artificial Neural Network"
nav:
---

# BCSC: Artificial Neural Network

<table class="full-width">
  <tbody>
    <tr>
      <td style="text-align: center;">스터디장</td>
      <td style="text-align: left;">윤시원</td>
    </tr>
    <tr>
      <td style="text-align: center;">스터디원</td>
      <td style="text-align: left;">권가민, 박정욱, 이한나, 정윤호, 차민경</td>
    </tr>
    <tr>
      <td style="text-align: center;">기간</td>
      <td style="text-align: left;">27 Sep – 22 Nov 2026</td>
    </tr>
    <tr>
      <td style="text-align: center;">시간</td>
      <td style="text-align: left;">일 18:00–20:00</td>
    </tr>
    <tr>
      <td style="text-align: center;">장소</td>
      <td style="text-align: left;">사당역</td>
    </tr>
    <tr>
      <td style="text-align: center;">모집글</td>
      <td style="text-align: left;"><a href="https://naver.me/5kPfVLGc" target="_blank">https://naver.me/5kPfVLGc</a></td>
    </tr>
  </tbody>
</table>


## Introduction
1. 뇌의 지능을 컴퓨터에 구현하기 위한 노력을 탐구하고
2. 뇌를 모방한 신경망을 컴퓨터서 학습하기 위한 공학적 요소를 탐구합니다.
3. 최종적으로 (1)과 (2)의 bridge가 있는지 탐구합니다.

## Materials
### Main Materials
- Week 1–4: [*Introduction to the Theory of Neural Computation*](https://www.taylorfrancis.com/books/mono/10.1201/9780429499661/introduction-theory-neural-computation-john-hertz) — Hertz, Krogh, and Palmer
- Week 5: [A Fast Learning Algorithm for Deep Belief Nets](https://www.cs.toronto.edu/~hinton/absps/fastnc.pdf) — Geoffrey E. Hinton, Simon Osindero, and Yee-Whye Teh
- Week 6: [Attention is All You Need](https://arxiv.org/pdf/1706.03762) — Ashish Vaswani et al.
- Week 7: [Hopfield Network is All You Need](https://arxiv.org/pdf/2008.02217) — Hubert Ramsauer et al.

### Additional Materials
- Week 2: <https://www.youtube.com/watch?v=ozyNz5-2Ek0>
- Week 4: <https://www.youtube.com/watch?v=tk9FTdKOL5Q>
- Week 5: Deep Learning — Yann LeCun, Yoshua Bengio, and Geoffrey Hinton
- Week 6: <https://colah.github.io/posts/2014-03-NN-Manifolds-Topology/>
- Week 6: <https://jalammar.github.io/illustrated-transformer/>
- Week 7: [Dense Associative Memory for Pattern Recognition](https://arxiv.org/pdf/1606.01164) — Dmitry Krotov and John J. Hopfield
- Week 7: <https://ml-jku.github.io/hopfield-layers/>


## Schedule

| Week |  Date   | Contents (Slides)                                 | Presenter  |
| :--: | :-----: | :------------------------------------------------ | :--------: |
|  1   | 27 Sep  | [Overview & McCulloch-Pitts Neuron](./pdf/w1.pdf) |    윤시원    |
|  2   |  4 Oct  | [Hopfield Model I](./pdf/w2.pdf)                  |    차민경    |
|  3   | 11 Oct  | Hopfield Model II                                 |    권가민    |
|      | 18 Oct  | 시험 주간                                           |            |
|      | 25 Oct  | 시험 주간                                           |            |
|  4   |  1 Nov  | Boltzmann Machines                                |    박정욱    |
|  5   |  8 Nov  | Deep Learning (RBM, DBN)                          |    이한나    |
|  6   | 15 Nov  | Attention is All You Need & Memory                |    정윤호    |
|  7   | 22 Nov  | Hopfield Network is All You Need                  |    권가민    |

## Attendance

|  이름  | Week 1  | Week 2  | Week 3  | Week 4  | Week 5  | Week 6  | Week 7  |
| :---: | :-----: | :-----: | :-----: | :-----: | :-----: | :-----: | :-----: |
| 윤시원  |   ✅    |   ✅    |         |         |         |         |         |
| 권가민  |    ✔    |    ✔    |         |         |         |         |         |
| 박정욱  |   ✅    |   ✅    |         |         |         |         |         |
| 이한나  |   ✅    |   ✅    |         |         |         |         |         |
| 정윤호  |   ✅    |   ✅    |         |         |         |         |         |
| 차민경  |   ✅    |    ✔    |         |         |         |         |         |

✅: 출석,
✔: 비대면 출석,
❌: 무단결석


## Book

|  Date   | Amount (₩)  | Total (₩)  |
| :-----: | :---------: | :--------: |
| Sep 27  |   14,000    |   14,000   |
|  Oct 4  |   14,000    |   28,000   |
| Oct 11  |   14,000    |   42,000   |

스터디룸 예약은 스터디 장이 진행하며, 스터디 마지막날 환급 금액 반영 후 정산 예정.

#### BCSC 환급 규칙:
- 모든 팀원이 최소 6회의 스터디에 모두 참여함: 1인당 7000원
- 모든 팀원이 최소 6회의 스터디에 모두 참여하지는 못했으나, 스터디 전체로 봤을 때는 대면 1회 포함 총 활동 6회를 충족했을 때: 1인당 5000원


## Memo

### Week 2
#### Hardware
<figure>
  <div style="display: flex; justify-content: center; gap: 20px;">
    <img src="./image/logic-computer.png" alt="logic" width="45%">
    <img src="./image/optoelectronic-computer.png" alt="optoelectronic" width="45%">
  </div>
  <figcaption>hardwares</figcaption>
</figure>

자세한 내용은 모르더라도, 우측 caption을 통해 Hopfield network를 회로로 규현하려는 시도임을 알 수 있습니다. 이 경우 hardware는 오직 neuron만으로 구성되는 것이 자연스러우며, 때문에 이 ‘computer’에는 clock을 전달하는 요소가 포함되지 아니하는 것이 자연스럽습니다.

추가로 Computer Sicence(CS)는 Computer에 관한 학문이 아닙니다. ( [MIT OpenCourseWareLecture 1A: Overview and Introduction to Lisp](https://www.youtube.com/watch?v=-J_xL4IGhJA&list=PLE18841CABEA24090) : CS를 computer에 대한 학문이라고 하는 것은 천문학이 망원경에 대한 학문이라고 말하는 것과 같습니다.) 저희 스터디의 목표 (1)은 `뇌의 지능을 컴퓨터에 모방하기 위한 노력을 탐구` 입니다. 여기서 computer를 우리가 실생활서 사용하는 computer로 한정한다면 다양한 공학적 요소는 필연적으로 따를 것입니다.

> An `associative memory model` using the `Hebb rule` for all possible pairs $$ij$$, with binary units and `asynchronous updating`, is usually called a **Hopfield model**.
> The term is also applied to various generalizations discussed in the next chapter. Although most of the ingredients of the model were known ezurlier, Hopfield’s influential paper [Hopfield, 1982] brought them together, introduced an energy function,and emphasized the idea of stored memories as dynamical attractors.

> The term `energy function` comes from a physical analogy to magnetic systems that we will discuss in the next section. But the concept is of much wider
> applicability; in many fields there is a state function that always decreases during dynamical evolution, or that must be minimized to find a stable or optimum state. In some fields the convention is reversed; the function increases or must be maximized. The most general name, from the theory of dynamic2d systems, is `Lyapunov function` [Cohen and Grossberg, 1983]. Other terms are `Hamiltonian` in statistical mechanics, `cost function` or `objective function` in optimization theory, and `fitness function` in evolutionary biology.

- 목적 여부
- local minimum vs. global minimum

### Week 3
#### 4R
> 임신이 되는 순간 결정되어버리는 당신의 게놈과는 달리, 당신의 커넥톰은 평생에 걸쳐 변화한다. 신경과학자들은 이미 이 변화의 기본 종류들을 알아냈다. 뉴런들은 그들 간의 연결의 세기를 강화하거나 약화시키는 방식으로 그 연결을 조정, 즉 '가중치를 변경<sup>Reweight</sup>'한다. 또 뉴런들은 시냅스를 새로 만들거나 제거함으로써 재연결<sup>Reconnect</sup>되며, 가지가 자라거나 축소됨으로써 재배선<sup>Rewire</sup>된다. 심지어는 재생<sup>Regeneration</sup>을 통해 기존의 뉴런은 제거되고 완전히 새로운 뉴런들이 생겨나기도 한다.
> 우리는 부모의 이혼이나 외국에서 보낸 멋진 시간과 같은 인생의 순간들이 어떻게 당신의 커넥톰을 변화시키는지 정확히 알지는 못한다. 그러나 네 가지 R(재가중<sup>Reweighting</sup>, 재연결<sup>Reconnection</sup>, 재배선<sup>Rewiring</sup>, 재생성<sup>Regeneration</sup>)이 경험의 영향을 받는다는 것을 보여주는 훌륭한 증거들이 존재한다. 동시에 네 가지 R은 또한 유전자의 안내도 받는다. 실제로 정신은 유전자의 영향을 받는데, 뇌가 스스로를 배선하는 시기인 유아기와 유년기 동안에 특히 그렇다.[^1]

[^1]: 승현준, *커넥톰, 뇌의 지도*, 2012

#### Energy
에너지가 낮다 $$\rightarrow$$ 확률적으로 오래 두었을 때 그 상태에 머무는 시간이 길다 = 확률이 높다 = surprise가 낮다

surprise: $$-\log \Pr(x)$$

$$H=-\frac{1}{2N}\sum_{\mu=1}^p{\left(\sum_i{S_i\xi_i^\mu}\right)^2} = -\frac{1}{\beta}\log\Pr(S) - \frac{1}{\beta}\log Z$$

$$\Pr(S) = \frac{1}{Z}\exp\!\left(\frac{\beta}{2N}\sum_{\mu=1}^{p}\Big(\sum_i S_i\xi_i^\mu\Big)^2\right)$$

$$Z = \sum_{S \,\in\, \{\pm1\}^N}\exp\!\left(\frac{\beta}{2N}\sum_{\mu=1}^{p}\Big(\sum_i S_i\xi_i^\mu\Big)^2\right)$$

$$\Longrightarrow$$ softmax?


## Discussion

### Week 2
- 💬 "에너지를 최소화한다"는 구조, 다른 곳에도 있을까?

- 💬 "기억한다"는 것은 무엇인가?
> Hopfield은 기억을 "에너지 최솟값에 수렴하는 것"으로 정의한다. 그런데 우리는 기억을 떠올릴 때마다 그 기억이 조금씩 변한다. Hopfield의 기억은 변하지 않는다. 그러면 "변하지 않는 기억"은 정말로 기억인가? 기억의 본질은 "고정된 것을 인출하는 것"인가, 아니면 "매번 다시 만드는 것"인가?

- 💬 우리는 "잊는다." 이 모델은 잊지 못한다.
> Hopfield network에서 저장된 패턴은 weight에 영구적으로 새겨진다. 망각이 없다. 그런데 인간에게 망각은 결함이 아니라 기능일 수 있다 — 불필요한 정보를 버려야 중요한 것에 집중할 수 있으니까. 망각 없는 기억 시스템이 정말로 지능적인가?

- 💬 왜 자석과 뇌가 같은 수학인가?
> Ising model은 자석이고 Hopfield은 뇌의 기억이다. 완전히 다른 시스템인데 같은 에너지 함수를 쓴다. 이것은 우연인가, 필연인가? "이진 상태의 상호작용 시스템"이면 어쩔 수 없이 같은 수학이 나오는 것인가? 수학이 같으면 "같은 현상"인가? 물이 흐르는 것도 전기가 흐르는 것도 같은 미분방정식을 따르는데, 그렇다고 물 = 전기인가?

- 💬 Spurious state: "있지도 않은 기억"은 버그인가?
> 저장한 적 없는 패턴이 안정 상태로 나타나는 것은 모델의 결함처럼 보인다. 하지만 인간의 뇌에서도 "있지도 않은 기억"이 생긴다 (false memory). 그리고 우리는 가끔 두 가지 경험을 혼합해서 완전히 새로운 아이디어를 만들어낸다. Spurious state가 "창의성"의 수학적 모델일 수 있는가?

### Week 3
- 💬 업데이트 순서는 계산의 일부인가?
> 2주차 메모에서 hardware Hopfield에는 clock이 없는 것이 자연스럽다고 했다. 3장은 모든 뉴런을 동시에 갱신하면(synchronous) 고정점은 그대로인데, 두 상태를 번갈아 오가는 2-cycle이 새로 생긴다고 한다. 같은 weight, 같은 규칙인데 "언제 갱신하는가"만으로 결과가 달라진다. 뇌에는 전역 clock이 없지만, 뇌파(oscillation)로 뉴런 집단이 박자를 맞추기도 한다. 타이밍은 계산을 담는 그릇(구현)인가, 계산의 내용 자체인가?

- 💬 무작위로 잘린 연결 vs 경험이 자른 연결
> HKP의 dilution은 시냅스를 무작위로 지운다. 반면 커넥톰의 4R(재가중, 재연결, 재배선, 재생성)은 경험에 따라 연결을 바꾼다. Hebb rule이 표현하는 것은 이 중 재가중뿐이다. 적게 연결될수록 시냅스당 효율이 높다면, 발달 과정에서 일어나는 대규모 가지치기(synaptic pruning)도 같은 논리로 설명되는가? 무작위 손상에 버티는 것(robustness)과 경험에 따라 골라 자르는 것은 같은 원리인가, 다른 원리인가?

- 💬 연결이 모두 바뀌어도 기억은 남는가
> 커넥톰에서 시냅스는 무작위로 생겨나고, 무작위로도 사라지며, 그 위에 경험에 따른 선택적 제거가 더해진다. HKP의 dilution은 이 중 "무작위 제거" 한 성분만 떼어낸 모델이라고 볼 수 있다. 연결이 무작위로 끊겨도 패턴은 여전히 인출된다. 그렇다면 시간이 충분히 흘러 원래 기억을 담았던 시냅스가 거의 모두 교체된 뒤에도 기억은 남을 수 있는가? 남는다면, 기억은 시냅스에 저장되는 것인가, 아니면 "인출하고 다시 새기는" 과정 속에서 유지되는 것인가? 무작위 제거는 기억을 갉아먹는 잡음인가, 아니면 선택이 작동하기 위해 필요한 재료인가?

- 💬 왜 뇌는 소수의 뉴런만 켜는가
> 기본 Hopfield 모델은 각 패턴에서 뉴런의 절반이 켜져 있다고 가정한다. 하지만 실제 뇌에서는 한 순간에 소수의 뉴런만 발화한다(sparse coding). 3.2는 패턴들이 서로 닮았거나(correlated) 켜진 비율이 한쪽으로 치우친(biased) 경우를 다룬다. 이때 Hebb rule을 그대로 쓰면 crosstalk가 커져 기억이 섞이지만, rule을 고치면 희소한 패턴은 오히려 더 많이 저장된다. 뇌가 희소하게 코딩하는 이유는 대사 에너지를 아끼기 위해서인가, 저장 용량을 늘리기 위해서인가, 아니면 기억끼리 덜 닮게 만들기 위해서인가?

- 💬 spike인가, firing rate인가
> 3.3에서 뉴런을 이진값에서 연속값으로 바꾸어도 같은 고정점을 얻는다. 결정론적 연속 뉴런의 출력 함수와 확률적 이진 뉴런의 평균 $$\langle S \rangle = \tanh(\beta h)$$는 같은 식이다. "잡음 섞인 이진 뉴런 여럿"과 "매끄러운 연속 뉴런 하나"를 바깥에서 구분할 수 없다면, 뉴런의 출력이 spike(이진)인지 firing rate(연속)인지는 계산의 관점에서 중요한 차이인가? 중요하다면, 그 차이는 어디서 드러나는가?

- 💬 음수 weight는 어디에 있는가
> Hebb rule은 한 뉴런이 어떤 이웃은 흥분시키고 어떤 이웃은 억제하는 weight를 만든다. 그런데 회로로 만들면 저항값은 양수뿐이라, 억제 연결을 구현하기가 어렵다. 뇌도 비슷한 제약을 갖는다. 대체로 한 뉴런은 흥분성이거나 억제성, 둘 중 하나다(Dale's principle). 뇌는 음수 weight를 어떻게 구현하는가? 억제성 interneuron이라는 우회로는 모델에 무엇을 더하고, 무엇을 바꾸는가?

- 💬 기억은 점인가, 궤적인가
> 대칭 weight는 고정점만 만든다. 에너지가 계속 내려가니 결국 멈출 수밖에 없다. 3.5는 비대칭 항 $$w_{ij} \propto \sum_\mu \xi_i^{\mu+1}\xi_j^\mu$$를 더해 패턴이 $$\xi^1 \to \xi^2 \to \xi^3$$으로 흘러가게 하고, 각 패턴이 자리잡을 때까지 시간 지연을 둔다. 노래를 떠올릴 때 한 음이 다음 음을 불러오듯, 우리는 순서를 통째로 기억한다. 기억의 기본 단위는 하나의 상태(점)인가, 상태들의 흐름(궤적)인가? 둘 중 하나가 다른 하나의 특수한 경우인가?