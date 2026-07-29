# Style Guide
> i hate that your watch is always 5 minutes late.

## Math

### Subtitle

Maths is written `$$...$$` in markdown; a single inline `$` is not maths at all.
kramdown does not read the inside of `$$...$$` as markdown, so `_`, `\\` and `*`
can be written as they are. A formula in the middle of a sentence is set inline,
one that takes up a paragraph on its own becomes display. KaTeX does the
typesetting.

Inline, in the middle of a sentence: if the learning rate $$\eta$$ is small
enough, $$x_{t+1} = x_t - \eta \nabla f(x_t)$$ decreases the value of $$f$$. The
same thing as display maths:

$$
\nabla f(x_t) = \left. \frac{\partial f}{\partial x} \right|_{x = x_t}
$$

Use `aligned` for several lines. `\\` breaks the line and `&` marks what the
lines line up on.

$$
\begin{aligned}
  \mathcal{L}(\theta)
    &= -\frac{1}{N} \sum_{i=1}^{N} \log p_\theta(y_i \mid x_i) \\
    &= -\frac{1}{N} \sum_{i=1}^{N} \left[ y_i \log \hat{y}_i + (1 - y_i) \log (1 - \hat{y}_i) \right]
\end{aligned}
$$

Use `cases` to split by case, and `pmatrix` or `bmatrix` for matrices.

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

KaTeX breaks a long formula at equals signs and binary operators by itself. Where
there is nothing to break on — a matrix, say — the formula scrolls sideways on
its own rather than widening the text column.

$$
p(x_{1:T}) = p(x_1) \prod_{t=2}^{T} p(x_t \mid x_{t-1}) = p(x_1) \prod_{t=2}^{T} \frac{\exp\left(-\beta E(x_t, x_{t-1})\right)}{\sum_{x'} \exp\left(-\beta E(x', x_{t-1})\right)}
$$

kramdown leaves the inside of an HTML block such as `<div class="theorem">`
alone, so write `\(...\)` for inline and `\[...\]` for display there instead of
`$$`.

<div class="theorem">
  If \(f\) is continuous on \([a, b]\), there is an antiderivative \(F\) with \[\int_a^b f(x) \, dx = F(b) - F(a).\]
</div>

## Lists

Bullets change marker down three levels in LaTeX's own order (&bull;, &ndash;,
&lowast;). Nest by indenting two spaces.

- Supervised learning
  - Classification
    - Binary
    - Multiclass
  - Regression
- Unsupervised learning
  - Clustering
    - Hierarchical clustering
      - The fourth level and below keep &lowast;

Numbered lists change the same way: 1. &rarr; a. &rarr; i.

1. Preparation
   1. Splitting the data
      1. Training set
      2. Validation set
   2. Preprocessing
2. Training

The two can be mixed, and an item may hold maths.

- Conditions for convergence
  1. The learning rates must sum to infinity: $$\sum_t \eta_t = \infty$$
  2. Their squares must converge: $$\sum_t \eta_t^2 < \infty$$

  An item whose content is nothing but a formula reads as display maths to
  kramdown and gets centred, so put a few words in front to keep it inline.

## Table

| Method | Accuracy | Notes |
|---|---|---|
| Baseline | 0.71 | reference |
| Ours | 0.88 | best |

## Footnote

A footnote goes here.[^one] And a second one.[^two]

[^one]: What the first note says.
[^two]: What the second note says.

## Theorem / Proof

<div class="theorem">
  A local minimum of a convex function is a global minimum.
</div>

<div class="proof">
  Trivial.
</div>

<div class="definition">
  A function \(f\) is convex when
  \(f(\lambda x + (1 - \lambda) y) \le \lambda f(x) + (1 - \lambda) f(y)\)
  for every \(x, y\) and every \(\lambda \in [0, 1]\).
</div>

## Figure caption

Numbering comes from `counter-increment` on `figure`. Wrapping the image in a
plain `<div>` leaves the counter where it was and the caption reads `Figure 0.`;
centring only the image leaves the caption on the left.

<figure>
  <img src="https://placehold.co/480x120/eeeeee/333333.png?text=figure" alt="placeholder">
  <figcaption>A caption, numbered for you.</figcaption>
</figure>

## Sidenote

A margin note is one tag. `site.js` adds the label and checkbox that fold it away
on a narrow screen, so neither the number nor an id has to be written by hand.

This sentence carries a note.<span class="sn">Set in the margin, and folded away when the screen is narrow. A [link](/) works here as usual.</span>

Wrap it in `{::nomarkdown}` when it holds a picture: kramdown escapes
`<figcaption>` in span context. Markdown is off inside, so write links as `<a>`.

{::nomarkdown}<figure class="sn"><img src="https://placehold.co/480x120/eeeeee/333333.png?text=sidenote" alt="placeholder"><figcaption>A figure in the margin.</figcaption></figure>{:/}
