# Exercise Tag Reference

This is a flat snapshot of every exercise in `client/src/lib/data.ts` with the tags the rating engine reads. Each tag drives one piece of the Hypertrophy Matrix score:

| Tag | Used by |
|-----|---------|
| `jointActions` | Coverage check & rating against the canonical 29-action taxonomy |
| `compound` | Compound-vs-Isolation criterion (target: 80% compound / 20% isolation) |
| `stretchEmphasis` | Deep-Stretch-Under-Load criterion |
| `stability` | Stability criterion (`very-high` → `low`) |
| `sfr` | Stimulus-to-Fatigue Ratio criterion (`very-high` → `low`) |
| `coachNotes` | Free-text reasoning from the Nippard / Israetel compendium |

**Joint-action abbreviations used in tables:**

| Short | Full |
|-------|------|
| `Sh Flex` | Shoulder Flexors |
| `Sh Ext` | Shoulder Extensors |
| `Sh Abd` | Shoulder Abductors |
| `Sh Add` | Shoulder Adductors |
| `Sh HAbd` | Shoulder Horizontal Abductors |
| `Sh HAdd` | Shoulder Horizontal Adductors |
| `Sh ER` | Shoulder External Rotators |
| `Scap Retr` | Scapular Retractors |
| `Scap Prot` | Scapular Protractors |
| `Scap UR` | Scapular Upward Rotators |
| `Scap DR` | Scapular Downward Rotators |
| `Elb Flex` | Elbow Flexors |
| `Elb Ext` | Elbow Extensors |
| `Sp Flex` | Spinal Flexors |
| `Sp Ext` | Spinal Extensors |
| `Sp Rot` | Spinal Rotators & Lateral Flexors |
| `Hip Flex` | Hip Flexors |
| `Hip Ext` | Hip Extensors |
| `Hip Abd` | Hip Abductors |
| `Hip Add` | Hip Adductors |
| `Knee Ext` | Knee Extensors |
| `Knee Flex` | Knee Flexors |
| `Ank PF` | Ankle Plantarflexors |

Stability/SFR levels: `VH` very-high · `H` high · `M` medium · `L` low
Compound: `C` (multi-joint) · `I` (isolation)
Stretch emphasis: ✓ if loaded in the lengthened position

---

## Tier 1 — Systemic / Multi-Joint

### Squat Patterns

#### Quad-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Upright Squat | Knee Ext, Hip Ext, Sp Ext | C | ✓ | M | H | Nippard high-bar S-tier; front squat A-tier; Smith for stable failure |
| Hack / Pendulum Squat | Knee Ext, Hip Ext | C | ✓ | H | VH | Nippard's #1 quad exercise |
| Belt Squat | Knee Ext, Hip Ext | C | ✓ | H | H | Israetel: low systemic fatigue, deep paused reps |
| Leg Press | Knee Ext, Hip Ext | C | ✗ | H | H | Nippard A-tier; main limit is ROM |
| Quad-Biased Split Squat / Lunge | Knee Ext, Hip Ext, Hip Abd | C | ✓ | M | H | Nippard S-tier unilateral quad work |

#### Glute & Adductor-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Long-Stride Lunge | Hip Ext, Knee Ext, Hip Add | C | ✓ | M | H | Nippard: lower-glute stretch under load |
| Front-Foot-Elevated Lunge | Hip Ext, Knee Ext, Hip Add | C | ✓ | M | H | Both coaches: deep glute stretch under tension |
| Glute-Biased Split Squat | Hip Ext, Knee Ext | C | ✓ | M | H | Forward-lean BSS for glute focus |
| Sit-Back Squat | Hip Ext, Knee Ext, Sp Ext | C | ✗ | M | H | Israetel + Nippard: glute-biased squat pattern |
| High Step-Up | Hip Ext, Knee Ext | C | ✓ | L | M | Nippard: useful upper-glute, weak for quads |

### Hinge Patterns

#### Hamstring-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Stiff-Leg / Romanian Deadlift | Hip Ext, Sp Ext, Knee Flex | C | ✓ | M | H | Israetel: deep hamstring stretch from sit-back |
| Good Morning | Hip Ext, Sp Ext | C | ✓ | L | M | Israetel: high-stimulus posterior chain |
| Cable Pull-Through | Hip Ext | C | ✗ | M | M | Nippard: beginner-friendly hinge |

#### Glute-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Hip Thrust | Hip Ext | C | ✗ | H | VH | Both coaches: top middle-glute, easy to overload |
| Glute Bridge | Hip Ext | C | ✗ | H | M | Nippard: beginner-friendly hip-thrust alt |
| Conventional / Sumo Deadlift | Hip Ext, Sp Ext, Knee Ext, Scap Retr | C | ✗ | M | L | Nippard: useful but fatiguing — not top hypertrophy |

#### Lumbar Extension & Spinal Robustness
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Back Extension (45°) | Hip Ext, Sp Ext | C | ✓ | H | H | Nippard S-tier glutes; full-ROM lumbar extension |
| Jefferson Curl | Sp Ext, Hip Ext | C | ✓ | L | L | Israetel: very light, gradual back resilience |

### Upper Body Push

#### Chest-Biased (Horizontal Push)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Chest Press | Sh HAdd, Sh Flex, Elb Ext, Scap Prot | C | ✓ | H | VH | Nippard: machine chest press is best chest builder |
| Incline Press | Sh Flex, Sh HAdd, Elb Ext, Scap Prot | C | ✓ | M | H | Nippard upper chest; Israetel: incline DB max stretch |
| Deficit Push-Up | Sh HAdd, Elb Ext, Scap Prot | C | ✓ | M | H | Israetel: ultra-deep chest stretch |
| Chest-Focused Dip | Sh Add, Sh HAdd, Elb Ext | C | ✓ | M | H | Nippard A-tier; Israetel: forward lean for chest |
| Cable Fly | Sh HAdd | I | ✓ | H | VH | Nippard: seated cable fly S-tier |
| Machine Fly (Pec Deck) | Sh HAdd | I | ✗ | H | H | Nippard A-tier; stable focused tension |
| Dumbbell Fly | Sh HAdd | I | ✓ | L | M | Nippard A-tier; deep stretch + contraction |

#### Vertical / Overhead Push
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Overhead Press | Sh Flex, Sh Abd, Elb Ext, Scap UR | C | ✗ | H | H | Nippard: machine OHP A+ for front delts |
| Close-Grip Press | Elb Ext, Sh Flex, Sh HAdd | C | ✓ | M | H | Nippard A-tier compound triceps |
| Triceps Dip (Vertical) | Elb Ext, Sh Flex, Sh Add | C | ✓ | M | H | Israetel: vertical-torso narrow grip |

### Upper Body Pull

#### Lat-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Lat Pulldown | Sh Add, Elb Flex, Scap DR | C | ✓ | H | VH | Nippard S-tier; preferred over pull-ups |
| Pull-Up / Chin-Up | Sh Add, Sh Ext, Elb Flex, Scap DR | C | ✓ | M | H | Israetel: unbeatable for lats |
| Straight-Arm Pulldown / Lat Prayer | Sh Ext | I | ✓ | H | VH | Israetel: deep lat stretch via forward lean |
| Pullover | Sh Ext, Sh Add | I | ✓ | M | H | Nippard: better as lat than chest |

#### Upper Back & Rhomboid
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Chest-Supported Row | Sh Ext, Scap Retr, Elb Flex | C | ✓ | H | VH | Nippard: best all-around back exercise |
| Cable Row | Sh Ext, Scap Retr, Elb Flex | C | ✓ | H | VH | Nippard S-tier horizontal row |
| Barbell Row | Sh Ext, Scap Retr, Elb Flex, Sp Ext | C | ✓ | L | M | Israetel: deficit for stretch; Nippard A-tier deficit Pendlay |
| Meadows Row | Sh Ext, Scap Retr, Elb Flex | C | ✓ | M | H | Nippard S-tier; isolateral stretch |
| Inverted Row to Face / Throat | Sh HAbd, Scap Retr, Elb Flex | C | ✗ | M | H | Israetel: rear-delt-heavy row line |

#### Bicep-Biased Pull
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Supinated Pulldown | Sh Add, Elb Flex | C | ✓ | H | H | — |
| Supinated Row | Sh Ext, Elb Flex, Scap Retr | C | ✓ | H | H | — |

---

## Tier 2 — Regional / Single-Joint

### Arm Isolation

#### Biceps — Lengthened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Bayesian Curl | Elb Flex | I | ✓ | H | VH | Nippard's #1 biceps |
| Incline Curl | Elb Flex | I | ✓ | M | H | Both coaches A-tier deep stretch |
| Lying / Flat-Bench Curl | Elb Flex | I | ✓ | M | H | Israetel: clown / lying cable for stretch |

#### Biceps — Shortened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Preacher Curl | Elb Flex | I | ✓ | H | VH | Nippard S-tier biceps |
| Cable Curl | Elb Flex | I | ✗ | H | H | Nippard A-tier; Superman variant strong |
| Strict Curl | Elb Flex | I | ✗ | M | H | Nippard A-tier; clean progression |

#### Brachialis Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Hammer Curl | Elb Flex | I | ✗ | M | H | Nippard A-tier |
| Preacher Hammer Curl | Elb Flex | I | ✓ | H | VH | Nippard S-tier brachialis |
| Reverse Curl | Elb Flex | I | ✗ | M | M | — |

#### Triceps — Long Head Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Overhead Triceps Extension | Elb Ext | I | ✓ | H | VH | Nippard S+ for long head |
| Katana Extension | Elb Ext | I | ✓ | H | H | Nippard A-tier long-head cable |
| French Press | Elb Ext | I | ✓ | M | M | Nippard B-tier; Israetel: solid LH option |

#### Triceps — Lateral / Medial Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Triceps Pressdown | Elb Ext | I | ✗ | H | H | Nippard A-tier bar pressdown |
| Skullcrusher | Elb Ext | I | ✓ | M | VH | Nippard S-tier; Israetel: near-perfect curve |
| Cable Kickback | Elb Ext | I | ✗ | H | M | Nippard A-tier; cable better than DB |

### Shoulder Isolation

#### Lateral Delt — Contracted Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Dumbbell Lateral Raise | Sh Abd | I | ✗ | M | M | Israetel: seated strict eccentric |
| Super-ROM Lateral Raise | Sh Abd | I | ✗ | M | M | Israetel: broader delt development |
| Machine Lateral Raise | Sh Abd | I | ✗ | H | H | Nippard: Atlantis A+ |

#### Lateral Delt — Stretch Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Cable Lateral Raise | Sh Abd | I | ✓ | H | VH | Nippard's #1 side-delt pick |
| Cable Y-Raise | Sh Abd, Scap UR | I | ✓ | H | H | Nippard S-tier |
| Behind-the-Back Cuffed Cable Lateral | Sh Abd | I | ✓ | H | H | Nippard S-tier; stretched side-delt |

#### Rear Delt
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Reverse Pec Deck | Sh HAbd | I | ✓ | H | VH | Nippard's best rear-delt |
| Reverse Cable Crossover | Sh HAbd | I | ✓ | H | VH | Nippard S-tier rear-delt |
| Face Pull | Sh ER, Sh HAbd, Scap Retr | I | ✗ | H | H | Israetel: rear-delt + rotator cuff |

#### Front Delt Isolation
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Front Raise | Sh Flex | I | ✗ | M | L | Nippard D-tier; only if pressing volume low |

### Leg Isolation

#### Hamstrings — Lengthened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Seated Leg Curl | Knee Flex | I | ✓ | H | VH | Nippard's #1 hamstring; lean forward to amplify |

#### Hamstrings — Shortened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Prone / Standing Leg Curl | Knee Flex | I | ✗ | H | H | Israetel: needed for complete hamstring dev |

#### Quadriceps Isolation (Rectus Femoris)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Leg Extension | Knee Ext | I | ✓ | H | VH | Nippard: near-perfect quad iso |
| Reverse Nordic Curl | Knee Ext | I | ✓ | L | H | Both coaches: massive quad stretch |
| Sissy Squat | Knee Ext | I | ✓ | L | M | Nippard: best quad stretching, awkward setup |

#### Calves
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Straight-Leg Calf Raise | Ank PF | I | ✓ | H | H | Israetel: deep loaded stretch with pause |
| Seated Calf Raise | Ank PF | I | ✗ | H | H | Israetel: useful soleus emphasis |

### Core Isolation

#### Upper Rectus Abdominis
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Abdominal Crunch Machine | Sp Flex | I | ✓ | H | VH | Israetel: best ab option when designed well |
| Cable Crunch | Sp Flex | I | ✓ | H | H | Israetel: accessible & loadable |
| Inverted Bench Crunch | Sp Flex | I | ✓ | M | H | — |

#### Lower Rectus / Hip Flexors
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| V-Up | Sp Flex, Hip Flex | I | ✗ | L | M | — |
| Ab Wheel Rollout | Sp Flex, Hip Flex | I | ✓ | L | H | Israetel: phenomenal tension; harder to progress |

#### Obliques (Rotation & Lateral Flexion)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Cable Woodchop | Sp Rot | I | ✗ | M | M | Standard rotational option |
| Pallof Press | Sp Rot | I | ✗ | H | M | Standard anti-rotation pick |
| Weighted Side Bend | Sp Rot | I | ✓ | M | M | — |

---

## Coverage at a glance

How well the current pool covers each canonical joint action. ★★★ = many strong options; ★ = thin coverage.

| Joint Action | Coverage | Top picks |
|---|---|---|
| Knee Extensors | ★★★ | Hack squat, Leg extension, Upright squat |
| Knee Flexors | ★★ | Seated Leg Curl, Prone Leg Curl, RDL |
| Hip Extensors | ★★★ | Hip Thrust, RDL, Long-Stride Lunge, Back Extension |
| Hip Adductors | ★ | Long-Stride Lunge, FFE Lunge (incidental only) |
| Hip Abductors | ★ | Quad-Biased Split Squat (incidental); **gap** for direct work |
| Shoulder Horizontal Adductors | ★★★ | Chest Press, Cable Fly, Incline Press |
| Shoulder Horizontal Abductors | ★★ | Reverse Pec Deck, Reverse Cable Crossover, Face Pull |
| Shoulder Adductors | ★★ | Lat Pulldown, Pull-Up, Chest Dip |
| Shoulder Extensors | ★★★ | Cable Row, Chest-Supported Row, Lat Prayer, Pullover |
| Shoulder Abductors | ★★★ | Cable Lateral, Machine Lateral, BTB Cuff Cable |
| Shoulder Flexors | ★★ | Overhead Press, Incline Press, Front Raise |
| Shoulder Internal Rotators | ✗ | **Gap** — no dedicated pick |
| Shoulder External Rotators | ★ | Face Pull only |
| Scapular Retractors | ★★ | Chest-Supported Row, Cable Row, Face Pull |
| Scapular Protractors | ★ | Chest Press, Incline Press (incidental) |
| Scapular Elevators | ✗ | **Gap** — no shrug-pattern in pool |
| Scapular Depressors | ✗ | **Gap** |
| Scapular Upward Rotators | ★ | Cable Y-Raise, Overhead Press |
| Scapular Downward Rotators | ★★ | Lat Pulldown, Pull-Up |
| Elbow Flexors | ★★★ | Bayesian, Preacher, Lat Pulldown |
| Elbow Extensors | ★★★ | Overhead Tri Ext, Skullcrusher, Pressdown |
| Spinal Flexors | ★★★ | Crunch Machine, Cable Crunch, Inverted Bench Crunch |
| Spinal Extensors | ★★ | Back Extension, RDL, Good Morning |
| Spinal Rotators & Lateral Flexors | ★★ | Woodchop, Pallof, Side Bend |
| Hip Flexors | ★ | V-Up, Ab Wheel (incidental) |
| Hip External / Internal Rotators | ✗ | **Gap** |
| Ankle Plantarflexors | ★★ | Straight-Leg Calf Raise, Seated Calf Raise |
| Ankle Dorsiflexors | ✗ | **Gap** |

**Known gaps** I'd want to flag for future fills:

- **Shoulder Internal Rotators** — no pick. Could add Cable Internal Rotation if wanted.
- **Scapular Elevators / Depressors** — no shrug variants in current pool. Add Barbell Shrug + Trap-3 Raise?
- **Hip Abductors / Adductors** — only incidental. Consider Cable Hip Abduction / Adduction Machine.
- **Hip Internal / External Rotators** — no isolated pick.
- **Ankle Dorsiflexors** — no Tib raise.

Most of these are minor stabilizers — the rating engine penalizes them lightly. But if you want a 100% complete pool, those are the additions.
