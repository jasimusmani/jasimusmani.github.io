---
layout: post
title: "Memory from Scratch — Hopfield Networks Explained"
date: 2026-05-18 12:00:00
description: "How a physicist in 1982 taught a grid of ±1 numbers to remember — with live interactive demos, full math derivations, and a working neural network you can play with right here."
tags: neural-networks machine-learning physics math
categories: ai
thumbnail: assets/img/hopfield_thumb.png
featured: true
toc:
  sidebar: left
---

> In 1982, physicist **John Hopfield** asked whether a mathematical network of simple binary nodes could store memories and recall them from partial or noisy inputs. The answer was yes — and that answer quietly underpins the attention mechanism in every modern Transformer. This post derives everything from first principles and lets you run the network live.

---

## 1. The Intuition — Neurons as Light Switches

Start with the simplest possible neuron: a binary switch. It's either **on** (+1) or **off** (−1). Nothing else. Arrange $$N$$ of these neurons in a network where every neuron is connected to every other.

Each neuron's state $$s_i \in \{-1, +1\}$$. The full network state at any moment is a vector:

$$
\mathbf{s} = (s_1, s_2, \ldots, s_N) \in \{-1, +1\}^N
$$

In the interactive demo below, we use a **12 × 10 pixel grid**, so $$N = 120$$. Each pixel is one neuron: white = +1, black = −1. A "memory" is just one particular configuration of all 120 switches — for example, the shape of the digit "0".

The question Hopfield answered: if we corrupt that pattern (flip some pixels randomly), can we configure the connections so the network automatically recovers the original?

---

## 2. Teaching the Network — Hebbian Learning

To store $$P$$ patterns $$\{\boldsymbol{\xi}^1, \boldsymbol{\xi}^2, \ldots, \boldsymbol{\xi}^P\}$$, we set the **weight** $$W_{ij}$$ between every pair of neurons using the **Hebb rule** — *"neurons that fire together, wire together"*:

$$
\boxed{W_{ij} = \frac{1}{P} \sum_{\mu=1}^{P} \xi_i^{\mu} \, \xi_j^{\mu}, \qquad W_{ii} = 0}
$$

Where:
- $$\xi_i^{\mu}$$ is the state of neuron $$i$$ in memory $$\mu$$
- $$P$$ is the number of patterns stored
- The matrix is **symmetric**: $$W_{ij} = W_{ji}$$
- **No self-connections**: $$W_{ii} = 0$$

If neurons $$i$$ and $$j$$ tend to be in the same state across patterns, $$W_{ij}$$ is positive — they reinforce each other. If they tend to oppose, $$W_{ij}$$ is negative. The weight matrix encodes the correlations between all pixel positions across all memories.

> **Key insight:** the patterns are never stored explicitly. All 8 memories are compressed into one 120 × 120 matrix of floating-point numbers. This is what allows the network to generalise from partial inputs.

```python
def create_weight_matrix(input_arrays):
    # input_arrays: (P=8, N=120)
    weights = np.zeros((120, 120))
    for i in range(120):
        for j in range(120):
            if i == j:
                weights[i, j] = 0                        # no self-connections
            else:
                w = sum(input_arrays[l, i] * input_arrays[l, j]
                        for l in range(len(input_arrays)))
                weights[i, j] = w / input_arrays.shape[0]  # divide by P
                weights[j, i] = weights[i, j]               # symmetry
    return weights   # (120, 120)
```

---

## 3. Recalling Memories — The Update Rule

Given a weight matrix and a noisy input, we let the network evolve. Each neuron looks at the weighted sum of all other neurons and snaps to +1 or −1:

$$
s_i(t+1) = \text{sign}\!\left(\sum_{j \neq i} W_{ij} \, s_j(t)\right) = \text{sign}\!\left(\mathbf{W}_i \cdot \mathbf{s}(t)\right)
$$

The demo implements two variants:

| Mode | Mechanics | Guarantee |
|------|-----------|-----------|
| **Synchronous** | All 120 neurons update simultaneously | Converges in cycles of length ≤ 2 |
| **Asynchronous** | One random neuron updates at a time | Energy decreases monotonically; always converges |

```python
# Synchronous: one matrix multiply
def synchronous_update(pattern, weights):
    return np.sign(np.dot(weights, pattern))

# Asynchronous: update one random neuron per step
def asynchronous_update(pattern, weights, max_iterations):
    updated = pattern.copy()
    for _ in range(max_iterations):
        i = random.randint(0, len(pattern) - 1)
        activation = np.dot(weights[i], updated)
        updated[i] = 1 if activation > 0 else -1 if activation < 0 else updated[i]
    return updated
```

---

## 4. The Energy Landscape — Why It Always Converges

This is the deepest insight. Hopfield imported the concept of **energy** from the Ising model of magnetic spins. Every state $$\mathbf{s}$$ has an associated energy:

$$
\boxed{E(\mathbf{s}) = -\frac{1}{2} \sum_{i \neq j} W_{ij} \, s_i \, s_j = -\frac{1}{2} \mathbf{s}^\top \mathbf{W} \mathbf{s}}
$$

The minus sign is crucial. When neurons aligned with a stored pattern are active, their positive weights drive the energy **lower**. Stored patterns are **energy minima** — valleys in a landscape. The noisy input is a ball placed on the hillside; the update rule rolls it downhill until it settles in the nearest valley.

**Proof that energy never increases (asynchronous mode):**

The change in energy when neuron $$i$$ flips is:

$$
\Delta E = -\Delta s_i \sum_{j \neq i} W_{ij} s_j
$$

The update rule sets $$s_i' = \text{sign}(\sum_j W_{ij} s_j)$$, which guarantees $$\Delta s_i$$ and $$\sum_j W_{ij} s_j$$ always share the same sign. Therefore $$\Delta E \leq 0$$. Since the state space is finite ($$2^N$$ states), the network **must** converge to a fixed point.

```python
def calculate_energy_evolution(pattern, weights, update_mode, iterations):
    energy_list, current = [], pattern.copy()
    for _ in range(iterations):
        energy_list.append(-0.5 * np.dot(current @ weights, current))
        current = (synchronous_update if update_mode == "Synchronous"
                   else lambda p, w: asynchronous_update(p, w, 1))(current, weights)
    return energy_list   # non-increasing in async mode
```

---

## 5. Storage Capacity — How Much Can It Remember?

You cannot store infinitely many patterns. As you add more, cross-pattern interference ("crosstalk") grows. The critical result from Amit, Gutfreund & Sompolinsky (1985) using the **replica method** from statistical physics:

$$
\boxed{P_{\max} \approx 0.138 \times N}
$$

For $$N = 120$$ neurons, the capacity limit is ≈ 16 patterns. The demo stores $$P = 8$$ — 48% of capacity, well within the reliable zone.

**Why 0.138?** Each stored pattern contributes signal of magnitude 1, while cross-pattern interference contributes noise with standard deviation $$\sqrt{P/N}$$. The local field at neuron $$i$$ when recalling pattern 1 is:

$$
h_i = \underbrace{\xi_i^1}_{\text{signal}} + \underbrace{\frac{1}{N}\sum_{\mu \neq 1} \sum_{j \neq i} \xi_i^\mu \xi_j^\mu s_j}_{\text{crosstalk, std dev} \approx \sqrt{P/N}}
$$

When $$P/N \approx 0.138$$, the signal-to-noise ratio drops below the retrieval threshold.

---

## 6. From Hopfield to Transformers

Hopfield networks aren't just history. In 2020, Ramsauer et al. showed that **modern Hopfield networks** — using a softmax-based energy instead of the sign rule — have exponentially higher capacity, and their update rule is mathematically identical to **scaled dot-product attention**:

$$
\mathbf{s}^{\text{new}} = \mathbf{X} \cdot \text{softmax}\!\left(\beta \mathbf{X}^\top \mathbf{s}\right)
$$

Where $$\mathbf{X}$$ is the matrix of stored patterns (keys/values) and $$\beta$$ is an inverse temperature. This is the **attention mechanism** in GPT, BERT, and every modern LLM.

> Every time a Transformer attends to its context window, it is performing one step of a Hopfield network retrieving a stored pattern. The 1982 physics model and the 2017 deep-learning revolution are the same thing, viewed from different angles.

---

## 7. Live Interactive Demo

The full Hopfield network runs below. Pick a digit (0, 1, 2, 3, 4, 6, 9, or Square), set a noise level, choose synchronous or asynchronous updates, and watch the network recover the original pattern. Hit **Show Energy Evolution** to see the energy descent.

<div style="
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(128,128,128,0.2);
  margin: 2rem 0;
  background: #0e1117;
  box-shadow: 0 4px 32px rgba(0,0,0,0.3);
">
  <div style="
    padding: 0.6rem 1rem;
    background: rgba(255,75,75,0.12);
    border-bottom: 1px solid rgba(128,128,128,0.2);
    font-family: monospace;
    font-size: 0.8rem;
    color: #ccc;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  ">
    <span style="width:10px;height:10px;border-radius:50%;background:#ff5f56;display:inline-block;"></span>
    <span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block;"></span>
    <span style="width:10px;height:10px;border-radius:50%;background:#27c93f;display:inline-block;"></span>
    &nbsp; Hopfield Network — Live App
    &nbsp;<span style="margin-left:auto;background:rgba(39,201,63,0.2);border:1px solid rgba(39,201,63,0.4);color:#27c93f;padding:0.1rem 0.6rem;border-radius:999px;font-size:0.72rem;">● LIVE</span>
  </div>
  <iframe
    src="https://hopfield-networks-viz.streamlit.app/?embed=true"
    style="width:100%;height:700px;border:none;display:block;"
    title="Hopfield Network Visualization"
    allow="camera; microphone"
    loading="lazy"
  ></iframe>
</div>

**Source code:** [github.com/jasimusmani/Hopfield_Network_Viz](https://github.com/jasimusmani/Hopfield_Network_Viz)

---

## Summary

| Concept | Formula |
|---------|---------|
| Network state | $$\mathbf{s} \in \{-1,+1\}^N$$ |
| Hebbian weights | $$W_{ij} = \frac{1}{P}\sum_\mu \xi_i^\mu \xi_j^\mu$$ |
| Update rule | $$s_i \leftarrow \text{sign}(\mathbf{W}_i \cdot \mathbf{s})$$ |
| Energy function | $$E = -\frac{1}{2}\mathbf{s}^\top \mathbf{W}\mathbf{s}$$ |
| Storage capacity | $$P_{\max} \approx 0.138N$$ |

The network stores memories implicitly in a weight matrix, then recovers them by descending an energy landscape. That's it — and it's the same mechanism sitting inside every Transformer you've ever used.

---

## References

1. Hopfield, J. J. (1982). Neural networks and physical systems with emergent collective computational abilities. *PNAS*, 79(8), 2554–2558.
2. Amit, D. J., Gutfreund, H., & Sompolinsky, H. (1985). Storing infinite numbers of patterns in a spin-glass model of neural networks. *Physical Review Letters*, 55(14), 1530.
3. Ramsauer, H., et al. (2020). Hopfield Networks Is All You Need. [arXiv:2008.02217](https://arxiv.org/abs/2008.02217)
