# Entropy Confidence Score — ECS v1

```
Status:   Frozen
Version:  1
Date:     2026-06-24
Protocol: OpenRNG VEO-1
```

---

## 1. Purpose

The Entropy Confidence Score (ECS) quantifies the quality and trustworthiness of a Verifiable Entropy Object's entropy sources.

ECS enables consumers to programmatically evaluate whether an entropy object meets their requirements without inspecting individual sources.

---

## 2. Score Range

```
0–1000
```

Integer values only.

---

## 3. Grade Boundaries

| Score     | Grade |
|-----------|-------|
| 900–1000  | AAA   |
| 800–899   | AA    |
| 700–799   | A     |
| 600–699   | B     |
| 500–599   | C     |
| 0–499     | LOW   |

Grade boundaries are frozen. Changes require ECS v2.

---

## 4. Dimensions

ECS is composed of six dimensions. Each dimension produces a 0–1000 sub-score.

| Dimension                | Weight | Description |
|--------------------------|--------|-------------|
| `freshness`              | 20%    | How recently the entropy was generated. Decays linearly over 10 minutes. |
| `diversity`              | 15%    | Ratio of unique live source IDs to target (3). |
| `independence`           | 20%    | Ratio of unique live source types to target (3). |
| `manipulation_resistance`| 20%    | Resistance to source manipulation. Higher with more independent sources. |
| `verification_success`   | 15%    | Success rate of source verification. |
| `availability`           | 10%    | Source availability at generation time. |

Dimension names and weights are frozen. Changes require ECS v2.

---

## 5. Computation

```
score = clamp(
  freshness × 0.20 +
  diversity × 0.15 +
  independence × 0.20 +
  manipulation_resistance × 0.20 +
  verification_success × 0.15 +
  availability × 0.10
)
```

Where `clamp(n) = max(0, min(1000, round(n)))`.

---

## 6. Dimension Calculations

### Freshness

```
age_seconds = (now - issued_at) / 1000
freshness = clamp(1000 - (age_seconds / 600) × 1000)
```

Decays linearly to 0 over 600 seconds (10 minutes).

### Diversity

```
live_unique_sources = count of unique source_id where source_reference ≠ "fallback-crypto-random"
diversity = clamp(min(live_unique_sources / 3, 1) × 1000)
```

### Independence

```
live_unique_types = count of unique source_type where source_reference ≠ "fallback-crypto-random"
independence = clamp(min(live_unique_types / 3, 1) × 1000)
```

### Manipulation Resistance

Base value:
- 3+ unique sources: 900
- 2 unique sources: 800
- 1 unique source: 650

Overridable by `manipulationResistance` input parameter.

### Verification Success

Default: 850. Overridable by `verificationSuccess` input parameter.

### Availability

Default: 800. Overridable by `availability` input parameter.

---

## 7. Fallback Penalties

When entropy sources fall back to `crypto.randomBytes` (indicated by `source_reference === "fallback-crypto-random"`), ECS MUST be penalized:

### 1 fallback source

- `verification_success` reduced by 100
- `manipulation_resistance` reduced by 50

### 2 fallback sources

- `verification_success` reduced by 250
- `manipulation_resistance` reduced by 150
- `diversity` reduced by 150

### All sources fallback

- All above penalties apply
- Total ECS capped at 650
- Grade cannot exceed B
- `source_status` set to `"fallback_only"`

---

## 8. Fallback Metadata

The ECS confidence object MUST include:

| Field               | Type    | Description |
|---------------------|---------|-------------|
| `fallback_count`    | integer | Number of sources using fallback |
| `live_source_count` | integer | Number of sources with live external data |
| `source_status`     | string  | Overall source health |

### Source Status Values

| Value          | Meaning |
|----------------|---------|
| `live`         | All sources returned live external data |
| `degraded`     | Some sources fell back |
| `fallback_only`| All sources fell back to crypto.randomBytes |
| `failed`       | No sources available |

---

## 9. Required Output

The `confidence` object in a VEO MUST include at minimum:

```json
{
  "score": 871,
  "grade": "AA"
}
```

Recommended full output:

```json
{
  "score": 871,
  "grade": "AA",
  "freshness": 1000,
  "diversity": 1000,
  "independence": 667,
  "manipulation_resistance": 900,
  "verification_success": 850,
  "availability": 800,
  "fallback_count": 0,
  "live_source_count": 3,
  "source_status": "live"
}
```

---

## 10. Backward Compatibility

- Dimension names MUST NOT change in ECS v1.
- Weights MUST NOT change in ECS v1.
- Grade boundaries MUST NOT change in ECS v1.
- Fallback penalty values MUST NOT change in ECS v1.
- New metadata fields MAY be added if backward compatible.
- Breaking changes REQUIRE ECS v2.
