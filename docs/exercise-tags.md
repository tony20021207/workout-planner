# Exercise Tag Reference

Flat snapshot of every exercise in `client/src/lib/data.ts` with the tags the rating engine reads.

| Tag | Used by |
|-----|---------|
| `jointActions` | Coverage check & rating against the canonical 29-action taxonomy |
| `compound` | Compound-vs-Isolation criterion (target: **40% compound / 60% isolation**) |
| `stretchEmphasis` | Deep-Stretch-Under-Load criterion |
| `stability` | Stability criterion (`very-high` → `low`) |
| `sfr` | Stimulus-to-Fatigue Ratio criterion (`very-high` → `low`) |
| `coachNotes` | Free-text reasoning from the Nippard / Israetel compendium |

**Equipment toggles have been removed.** Each exercise now specifies the canonical implement in its name. Where the implement materially changes the biomechanics (chest press, overhead press, hip thrust), separate entries cover machine vs free-weight variants.

**Joint-action abbreviations:**

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
| Barbell Back Squat | Knee Ext, Hip Ext, Sp Ext | C | ✓ | M | H | Nippard high-bar S-tier |
| Hack Squat | Knee Ext, Hip Ext | C | ✓ | H | VH | Nippard's #1 quad exercise |
| Belt Squat | Knee Ext, Hip Ext | C | ✓ | H | H | Israetel: low systemic fatigue, deep paused reps |
| 45° Leg Press | Knee Ext, Hip Ext | C | ✗ | H | H | Nippard A-tier; main limit is ROM |
| Bulgarian Split Squat (Quad-Biased, DB) | Knee Ext, Hip Ext, Hip Abd | C | ✓ | M | H | Nippard S-tier unilateral quad work |

#### Glute & Adductor-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Walking Lunge (Dumbbell) | Hip Ext, Knee Ext, Hip Add | C | ✓ | M | H | Nippard: lower-glute stretch under load |
| Front-Foot-Elevated Lunge (Dumbbell) | Hip Ext, Knee Ext, Hip Add | C | ✓ | M | H | Both coaches: deep glute stretch |
| Bulgarian Split Squat (Glute-Biased, DB) | Hip Ext, Knee Ext | C | ✓ | M | H | Forward-lean BSS for glute focus |
| Barbell Low-Bar Squat | Hip Ext, Knee Ext, Sp Ext | C | ✗ | H | H | Israetel + Nippard: glute-biased squat pattern |
| Dumbbell High Step-Up | Hip Ext, Knee Ext | C | ✓ | M | M | Nippard: useful upper-glute |

### Hinge Patterns

#### Hamstring-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Barbell Romanian Deadlift | Hip Ext, Sp Ext, Knee Flex | C | ✓ | M | H | Israetel: deep hamstring stretch from sit-back |
| Barbell Good Morning | Hip Ext, Sp Ext | C | ✓ | L | M | Israetel: high-stimulus posterior chain |
| Cable Pull-Through | Hip Ext | C | ✓ | H | H | Nippard: beginner-friendly hinge |

#### Glute-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Machine Hip Thrust | Hip Ext | C | ✗ | H | VH | Nippard: top middle-glute option |
| Barbell Hip Thrust | Hip Ext | C | ✗ | M | H | Israetel: hard shortened-position glute contraction |
| Barbell Glute Bridge | Hip Ext | C | ✗ | H | M | Nippard: beginner-friendly hip-thrust alt |
| Conventional Barbell Deadlift | Hip Ext, Sp Ext, Knee Ext, Scap Retr | C | ✗ | M | L | Useful but fatiguing — not top hypertrophy |

#### Lumbar Extension & Spinal Robustness
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Back Extension (45°) | Hip Ext, Sp Ext | C | ✓ | H | H | Nippard S-tier glutes; full-ROM lumbar |
| Barbell Good Morning (Lumbar Focus) | Hip Ext, Sp Ext | C | ✓ | L | M | Same lift as hamstring entry, scored under spinal robustness |
| Barbell Jefferson Curl | Sp Ext, Hip Ext | C | ✓ | L | L | Israetel: very light, gradual back resilience |

### Upper Body Push

#### Chest-Biased (Horizontal Push)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| **Machine Chest Press** | Sh HAdd, Sh Flex, Elb Ext, Scap Prot | C | ✓ | H | VH | Nippard's overall best chest builder |
| **Barbell Bench Press** | Sh HAdd, Sh Flex, Elb Ext, Scap Prot | C | ✗ | M | H | Heavy load potential; less stretch than DB |
| **Dumbbell Bench Press** | Sh HAdd, Sh Flex, Elb Ext, Scap Prot | C | ✓ | M | H | Israetel: deeper bottom stretch |
| Incline Dumbbell Press | Sh Flex, Sh HAdd, Elb Ext, Scap Prot | C | ✓ | M | H | Israetel: incline DB max stretch |
| Deficit Push-Up (Push-Up Handles) | Sh HAdd, Elb Ext, Scap Prot | C | ✓ | M | H | Israetel: ultra-deep chest stretch |
| Parallel Bar Dip (Chest-Focused) | Sh Add, Sh HAdd, Elb Ext | C | ✓ | M | H | Israetel: forward lean for chest |
| Seated Cable Fly | Sh HAdd | I | ✓ | H | VH | Nippard: S-tier; constant tension at deep stretch |
| Machine Fly (Pec Deck) | Sh HAdd | I | ✓ | H | H | Nippard A-tier |
| Flat Dumbbell Fly | Sh HAdd | I | ✓ | M | H | Nippard A-tier; deep stretch + contraction |

#### Vertical / Overhead Push
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| **Machine Shoulder Press** | Sh Flex, Sh Abd, Elb Ext, Scap UR | C | ✗ | H | H | Nippard: A+ for front delts |
| **Dumbbell Overhead Press** | Sh Flex, Sh Abd, Elb Ext, Scap UR | C | ✓ | M | H | Nippard: seated DB press A-tier |
| Close-Grip Bench Press | Elb Ext, Sh Flex, Sh HAdd | C | ✓ | M | H | Nippard A-tier compound triceps |
| Parallel Bar Dip (Triceps, Vertical) | Elb Ext, Sh Flex, Sh Add | C | ✓ | M | H | Israetel: vertical-torso narrow grip |

### Upper Body Pull

#### Lat-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Cable Lat Pulldown (Neutral Grip) | Sh Add, Elb Flex, Scap DR | C | ✓ | H | VH | Nippard S-tier; preferred over pull-ups |
| Single-Arm Cable Pulldown | Sh Add | I | ✓ | H | VH | Elbow tucked / minimal flexion = pure lat |
| Single-Arm Dumbbell Row (Elbow-Tucked) | Sh Ext, Elb Flex | C | ✓ | M | H | Tucked elbow = lat focus |
| Cable Lat Prayer | Sh Ext | I | ✓ | H | VH | Israetel: deep lat stretch via forward lean |
| Cable Pullover | Sh Ext, Sh Add | I | ✓ | M | H | Nippard: better as lat than chest |

#### Upper Back & Rhomboid
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| T-Bar Chest-Supported Row | Sh Ext, Scap Retr, Elb Flex | C | ✓ | H | VH | Nippard: best all-around back |
| Seated Cable Row (Wide Grip, Elbow-Flared) | Sh HAbd, Scap Retr, Elb Flex | C | ✓ | H | VH | Wide-elbow path = mid-back focus |
| Barbell Pendlay Row | Sh Ext, Scap Retr, Elb Flex, Sp Ext | C | ✓ | L | M | Nippard: A-tier deficit Pendlay for stretch |
| Landmine Meadows Row | Sh Ext, Scap Retr, Elb Flex | C | ✓ | M | H | Nippard S-tier; isolateral stretch |
| Smith Inverted Row to Face/Throat | Sh HAbd, Scap Retr, Elb Flex | C | ✗ | M | H | Israetel: rear-delt-heavy row line |
| Single-Arm DB Row (Bench-Supported, Elbow-Flared) | Sh HAbd, Scap Retr, Elb Flex | C | ✓ | M | H | Flared elbow = mid-back / rhomboid focus |
| Cable Face Pull (Rhomboid) | Sh HAbd, Scap Retr, Elb Flex | C | ✓ | M | H | Mid-back biased counterpart to rear-delt face pull |

#### Bicep-Biased Pull
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Chin-Up (Underhand) | Sh Add, Sh Ext, Elb Flex, Scap DR | C | ✓ | M | H | Israetel: unbeatable for lats; supinated grip recruits elbow flexors |
| Cable Underhand Pulldown | Sh Add, Elb Flex | C | ✓ | H | H | — |
| Cable Underhand Row | Sh Ext, Elb Flex, Scap Retr | C | ✓ | H | H | — |

---

## Tier 2 — Regional / Single-Joint

### Arm Isolation

#### Biceps — Lengthened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Single-Arm Cable Bayesian Curl | Elb Flex | I | ✓ | H | VH | Nippard's #1 biceps |
| Incline Dumbbell Curl | Elb Flex | I | ✓ | M | H | Israetel & Nippard A-tier deep stretch |
| Lying Cable Curl | Elb Flex | I | ✓ | M | H | Israetel: hard biceps stretch |

#### Biceps — Shortened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Machine Preacher Curl | Elb Flex | I | ✓ | H | VH | Nippard S-tier biceps |
| Standing Cable Curl | Elb Flex | I | ✗ | H | H | Nippard A-tier |
| Barbell Strict Curl | Elb Flex | I | ✗ | M | H | Nippard A-tier; clean progression |

#### Brachialis Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Cross-Body Dumbbell Hammer Curl | Elb Flex | I | ✗ | M | H | Nippard A-tier |
| Machine Preacher Hammer Curl | Elb Flex | I | ✓ | H | VH | Nippard S-tier brachialis |
| EZ-Bar Reverse Curl | Elb Flex | I | ✗ | M | M | Pronated grip biases brachialis |

#### Triceps — Long Head Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| EZ-Bar Overhead Triceps Extension | Elb Ext | I | ✓ | H | VH | Nippard S+ for long head |
| Single-Arm Cable Katana Extension | Elb Ext | I | ✓ | H | H | Nippard A-tier long-head cable |
| Dumbbell French Press | Elb Ext | I | ✓ | M | M | Nippard B-tier; solid LH option |

#### Triceps — Lateral / Medial Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Cable V-Bar Triceps Pressdown | Elb Ext | I | ✗ | H | H | Nippard A-tier |
| EZ-Bar Skullcrusher | Elb Ext | I | ✓ | M | VH | Nippard S-tier; near-perfect curve |
| Single-Arm Cable Kickback | Elb Ext | I | ✗ | H | H | Nippard A-tier; cable better than DB |

### Shoulder Isolation

#### Medial Delt — Contracted Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Lean-In Dumbbell Lateral Raise | Sh Abd | I | ✗ | M | M | Nippard: lean-in DB raises highly ranked |
| Dumbbell Super-ROM Lateral Raise | Sh Abd | I | ✗ | M | M | Israetel: broader delt development |
| Selectorized Machine Lateral Raise | Sh Abd | I | ✗ | H | H | Nippard: machine stability isolates side delts |

#### Medial Delt — Stretch Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Single-Arm Cable Lateral Raise | Sh Abd | I | ✓ | H | VH | Nippard's #1 side-delt pick |
| Dual-Cable Y-Raise | Sh Abd, Scap UR | I | ✓ | H | H | Nippard S-tier |
| Behind-the-Back Single-Arm Cuffed Cable Lateral | Sh Abd | I | ✓ | H | H | Nippard S-tier; stretched side-delt |

#### Rear Delt
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Single-Arm Cross-Body Reverse Pec Deck | Sh HAbd | I | ✓ | H | VH | Nippard's best rear-delt |
| Reverse Cable Crossover (Handles) | Sh HAbd | I | ✓ | H | VH | Nippard S-tier rear-delt |
| Cable Rope Face Pull (Rear Delt) | Sh ER, Sh HAbd, Scap Retr | I | ✗ | H | H | Israetel: rear-delt + rotator cuff |

#### Front Delt Isolation
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Cable Front Raise | Sh Flex | I | ✗ | M | L | Nippard D-tier; only if pressing volume low |

### Leg Isolation

#### Hamstrings — Lengthened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Seated Leg Curl Machine | Knee Flex | I | ✓ | H | VH | Nippard's #1 hamstring |

#### Hamstrings — Shortened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Lying Leg Curl Machine | Knee Flex | I | ✗ | H | H | Israetel: needed for complete hamstring dev |

#### Quadriceps Isolation (Rectus Femoris)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Leg Extension Machine | Knee Ext | I | ✓ | H | VH | Nippard: near-perfect quad iso |
| Bodyweight Reverse Nordic Curl | Knee Ext | I | ✓ | L | H | Both coaches: massive quad stretch |
| Sissy Squat (Sissy Bench) | Knee Ext | I | ✓ | L | M | Nippard: best quad stretching, awkward setup |

#### Calves
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Standing Calf Raise Machine | Ank PF | I | ✓ | H | H | Israetel: deep loaded stretch with pause |
| Seated Calf Raise Machine | Ank PF | I | ✗ | H | H | Israetel: useful soleus emphasis |

### Core Isolation

#### Upper Rectus Abdominis
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Selectorized Abdominal Crunch Machine | Sp Flex | I | ✓ | H | VH | Israetel: best ab option when designed well |
| Cable Rope Crunch | Sp Flex | I | ✓ | H | H | Israetel: accessible & loadable |
| Decline Bench Crunch (Weighted Plate) | Sp Flex | I | ✓ | M | H | — |

#### Lower Rectus / Hip Flexors
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Bodyweight V-Up | Sp Flex, Hip Flex | I | ✗ | L | M | — |
| Ab Wheel Rollout | Sp Flex, Hip Flex | I | ✓ | L | H | Israetel: phenomenal tension |

#### Obliques (Rotation & Lateral Flexion)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Coach Note |
|---|---|---|---|---|---|---|
| Cable Woodchop (D-Handle) | Sp Rot | I | ✗ | M | M | Standard rotational option |
| Cable Pallof Press | Sp Rot | I | ✗ | H | M | Standard anti-rotation pick |
| Dumbbell Side Bend | Sp Rot | I | ✓ | M | M | — |

---

## Coverage at a glance

How well the current pool covers each canonical joint action.

| Joint Action | Coverage | Top picks |
|---|---|---|
| Knee Extensors | ★★★ | Hack Squat, Leg Extension Machine, Barbell Back Squat |
| Knee Flexors | ★★ | Seated Leg Curl, Lying Leg Curl, Romanian Deadlift |
| Hip Extensors | ★★★ | Machine Hip Thrust, RDL, Walking Lunge, Back Extension |
| Hip Adductors | ★ | Walking Lunge, FFE Lunge (incidental) |
| Hip Abductors | ★ | Bulgarian Split Squat (incidental); **gap** for direct work |
| Shoulder Horizontal Adductors | ★★★ | Machine Chest Press, Seated Cable Fly, Incline DB Press |
| Shoulder Horizontal Abductors | ★★★ | Reverse Pec Deck, Reverse Cable Crossover, Cable Row Wide-Grip |
| Shoulder Adductors | ★★ | Cable Lat Pulldown, Chin-Up, Single-Arm Cable Pulldown |
| Shoulder Extensors | ★★★ | T-Bar Chest-Supported Row, Cable Lat Prayer, Cable Pullover |
| Shoulder Abductors | ★★★ | Single-Arm Cable Lateral, Machine Lateral, BTB Cuff Cable |
| Shoulder Flexors | ★★ | Machine Shoulder Press, Incline DB Press |
| Shoulder Internal Rotators | ✗ | **Gap** |
| Shoulder External Rotators | ★ | Face Pull only |
| Scapular Retractors | ★★ | T-Bar Chest-Supported Row, Cable Row Wide-Grip, Face Pull |
| Scapular Protractors | ★ | Chest Press variants (incidental) |
| Scapular Elevators | ✗ | **Gap** — no shrug pattern |
| Scapular Depressors | ✗ | **Gap** |
| Scapular Upward Rotators | ★ | Dual-Cable Y-Raise, Machine Shoulder Press |
| Scapular Downward Rotators | ★★ | Cable Lat Pulldown, Chin-Up |
| Elbow Flexors | ★★★ | Bayesian Curl, Machine Preacher, Cable Lat Pulldown |
| Elbow Extensors | ★★★ | EZ-Bar OH Triceps, EZ Skullcrusher, V-Bar Pressdown |
| Spinal Flexors | ★★★ | Crunch Machine, Cable Crunch, Decline Bench Crunch |
| Spinal Extensors | ★★ | Back Extension, RDL, Good Morning |
| Spinal Rotators & Lateral Flexors | ★★ | Woodchop, Pallof Press, Side Bend |
| Hip Flexors | ★ | V-Up, Ab Wheel (incidental) |
| Hip External / Internal Rotators | ✗ | **Gap** |
| Ankle Plantarflexors | ★★ | Standing Calf Raise, Seated Calf Raise |
| Ankle Dorsiflexors | ✗ | **Gap** |

**Known gaps** (mostly minor stabilizers — light penalty in rating):

- Shoulder Internal Rotators
- Scapular Elevators / Depressors (no shrugs)
- Hip Abductors / Adductors (no direct cable abduction / adduction)
- Hip Internal / External Rotators
- Ankle Dorsiflexors (no Tib raise)

If you want full coverage we can add these in a future pass.
