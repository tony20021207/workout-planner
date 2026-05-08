# Exercise Tag Reference

Flat snapshot of every exercise in `client/src/lib/data.ts` with the tags the rating engine reads.

| Tag | Used by |
|-----|---------|
| `jointActions` | Coverage check & rating against the canonical 29-action taxonomy |
| `compound` | Compound-vs-Isolation criterion (target: **40% compound / 60% isolation**) |
| `stretchLevel` | Deep-Stretch-Under-Load criterion. 3-tier: `moderate` (baseline lengthening) / `high` (primary stretch focus) / `very-high` (consensus "best stretch" picks) |
| `stability` | Stability criterion (`very-high` → `low`) |
| `sfr` | Stimulus-to-Fatigue Ratio criterion (`very-high` → `low`) |
| `coachNotes` | Free-text reasoning from the Nippard / Israetel compendium |

**Equipment policy** (per user spec):

- Same underlying muscle engagement → variants live as an **equipment toggle** on a single entry (e.g. RDL has BB / DB / Smith / Cable; all train Hip Extensors + Spinal Extensors + Knee Flexors identically).
- Different muscle engagement (different stability or stretch profile) → **separate entries**. The 3 split exercises:
  - **Chest Press** → Machine Chest Press / Barbell Bench Press / Dumbbell Bench Press (each with flat / 15° / 30° / 45° angle toggle)
  - **Overhead Press** → Machine Shoulder Press / Free-Weight Overhead Press
  - **Hip Thrust** → Machine Hip Thrust / Free-Weight Hip Thrust

**Tag overrides on toggles:** Equipment / angle options can carry an optional `tagOverrides` block that quietly modifies the rating-relevant tags when that option is selected. Examples:

- **30° BB Bench Press** → `{ stretchEmphasis: true }` (longer pressing arc gives real stretch)
- **Toes-Spread squat stance** → `{ addJointActions: ["Hip Abductors", "Hip External Rotators"] }`
- **Wide Stance Hack/Leg Press** → `{ addJointActions: ["Hip Adductors"] }`
- **Sumo Deadlift** → `{ addJointActions: ["Hip Adductors", "Hip External Rotators"] }`
- **B-Stance Hip Thrust** → `{ addJointActions: ["Hip Abductors"] }`
- **75° Incline Curl** → `{ stretchEmphasis: false }` (closer to upright = less stretch than 45°)
- **Pec Deck Low Seat** → `{ addJointActions: ["Shoulder Flexors"] }` (upper-chest bias)
- **Close-Grip Pulldown** → `{ addJointActions: ["Shoulder Extensors"] }` (deeper adduction recruits posterior fibers)
- **Horizontal-Elbow Face Pull** → `{ removeJointActions: ["Shoulder External Rotators"] }` (path shifts away from rotation toward retraction)

The user just sees a toggle. The rating engine resolves the effective tags via `resolveEffectiveTags(exercise, equipment, angle)` and uses those for joint-action coverage and the anatomical-size-weighted balance check.

**Taxonomy update:** Shoulder Internal Rotators and Ankle Dorsiflexors removed from the canonical list (incidentally trained / minimal muscle). Down to **27 joint actions** from 29.

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
Stretch column: `mod` moderate · `high` · **`VH`** very-high
"Equipment" column lists the toggle options on that entry.

**Very-high stretch base picks** (11): Bayesian Curl, Lat Prayer, Pullover, Sissy Squat, Reverse Nordic Curl, Deficit Push-Up, Stiff-Leg/Romanian Deadlift, EZ-Bar Overhead Triceps Extension, BTB Cuffed Cable Lateral, Jefferson Curl, Cable Fly.

**Very-high via toggle override**: Cambered Bar BB Bench (any incline), BB Bench at 30°/45° incline, DB Bench at 30°/45° incline, Incline DB Fly, Janicki DB Fly, Skullcrusher Over-Head Path, Seated Leg Curl Lean-Forward, Bulgarian Split Squat (Quad) FFE, Bulgarian Split Squat (Glute) Long Stride / FFE, Cable Single-Leg Step-Up.

---

## Tier 1 — Systemic / Multi-Joint

### Squat Patterns

#### Quad-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Angles | Coach Note |
|---|---|---|---|---|---|---|---|---|
| Upright Squat | Knee Ext, Hip Ext, Sp Ext | C | ✓ | M | H | BB Back, Front, Smith, Heel-Elevated | Parallel, **Toes-Spread** (+Hip Abd, +Hip ER) | Nippard high-bar S-tier |
| Hack / Pendulum Squat | Knee Ext, Hip Ext | C | ✓ | H | VH | Hack Machine, Pendulum | Parallel, Toes-Spread (+Hip Abd, +Hip ER) | Nippard's #1 quad |
| Belt Squat | Knee Ext, Hip Ext | C | ✓ | H | H | Belt Machine, Cable | Parallel, Toes-Spread (+Hip Abd, +Hip ER) | Israetel: low systemic fatigue |
| Leg Press | Knee Ext, Hip Ext | C | ✗ | H | H | 45°, Plate-Loaded, Selectorized | Parallel, Toes-Spread (+Hip Abd, +Hip ER) | Nippard A-tier |
| Quad-Biased Split Squat / Lunge | Knee Ext, Hip Ext, Hip Abd | C | ✓ | M | H | Bulgarian, DB, Smith | — | Nippard S-tier unilateral |

#### Glute & Adductor-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Long-Stride Lunge | Hip Ext, Knee Ext, Hip Add | C | ✓ | M | H | Walking, DB, BB, Smith | Nippard: lower-glute stretch |
| Front-Foot-Elevated Lunge | Hip Ext, Knee Ext, Hip Add | C | ✓ | M | H | Smith, DB, BB, Cable | Both: deep glute stretch |
| Glute-Biased Split Squat | Hip Ext, Knee Ext | C | ✓ | M | H | Bulgarian, DB, Smith | Forward-lean BSS |
| Sit-Back Squat | Hip Ext, Knee Ext, Sp Ext | C | ✗ | H | H | Low-Bar, Smith, Box | Glute-biased squat pattern |
| High Step-Up | Hip Ext, Knee Ext | C | ✓ | M | M | DB, BB, Smith, BW | Nippard: useful upper-glute |

### Hinge Patterns

#### Hamstring-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Stiff-Leg / Romanian Deadlift | Hip Ext, Sp Ext, Knee Flex, **Scap Elev** | C | **VH** | M | H | BB, DB, Smith, Cable | Israetel: deep hamstring stretch; barbell hold trains traps isometrically |
| Good Morning | Hip Ext, Sp Ext | C | ✓ | L | M | BB, SSB, Smith | Israetel: high-stimulus posterior chain |
| Cable Pull-Through | Hip Ext | C | ✓ | H | H | Cable Rope, Band | Beginner-friendly hinge |

#### Glute-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| **Machine Hip Thrust** | Hip Ext | C | ✗ | H | VH | Machine | Nippard: top middle-glute option |
| **Free-Weight Hip Thrust** | Hip Ext | C | ✗ | M | H | BB, DB, Smith | Israetel: hard shortened-position glute |
| Glute Bridge | Hip Ext | C | ✗ | H | M | BB, DB, Machine, BW | Beginner-friendly hip-thrust alt |
| Conventional / Sumo Deadlift | Hip Ext, Sp Ext, Knee Ext, Scap Retr, **Scap Elev** | C | ✗ | M | L | BB, Trap Bar, DB | Useful but fatiguing |

#### Lumbar Extension & Spinal Robustness
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Back Extension (45°) | Hip Ext, Sp Ext | C | ✓ | H | H | 45° Bench, Horizontal, GHD | Nippard S-tier glutes |
| Good Morning (Lumbar Focus) | Hip Ext, Sp Ext | C | ✓ | L | M | BB, SSB, Smith | Same lift, scored under spinal robustness |
| Jefferson Curl | Sp Ext, Hip Ext | C | ✓ | L | L | BB, DB, KB | Israetel: very light, gradual |

### Upper Body Push

#### Chest-Biased (Horizontal Push)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Angles | Coach Note |
|---|---|---|---|---|---|---|---|---|
| **Machine Chest Press** | Sh HAdd, Sh Flex, Elb Ext, Scap Prot | C | ✓ | H | VH | Selectorized, Plate-Loaded | Flat / Mid Seat, Incline Seat | Nippard's #1 chest |
| **Barbell Bench Press** | Sh HAdd, Sh Flex, Elb Ext, Scap Prot | C | ✗ | M | H | Standard BB, Smith, Cambered (✓ stretch override) | Flat, 15°, **30°** (✓ stretch override), 45° (✓ stretch override) | Heavy load; flat caps stretch — 30° or cambered restores it |
| **Dumbbell Bench Press** | Sh HAdd, Sh Flex, Elb Ext, Scap Prot | C | ✓ | M | H | DB | Flat, 15°, 30°, 45° | Israetel: incline DB for max stretch |
| Deficit Push-Up | Sh HAdd, Elb Ext, Scap Prot | C | ✓ | M | H | Handles, DB Handles, Parallettes, Blocks | — | Israetel: ultra-deep stretch |
| Chest-Focused Dip | Sh Add, Sh HAdd, Elb Ext | C | ✓ | M | H | Parallel Bars, Assisted, Plate-Loaded | — | Israetel: forward lean |
| Cable Fly | Sh HAdd | I | ✓ | H | VH | Seated, Standing, Crossover, Press-Around | High-to-Low / Mid / Low-to-High | Nippard S-tier |
| Machine Fly (Pec Deck) | Sh HAdd | I | ✓ | H | H | Pec Deck, Plate-Loaded | — | Nippard A-tier |
| Dumbbell Fly | Sh HAdd | I | ✓ | M | H | Flat, Incline, Janicki | — | A-tier; deep stretch |

#### Vertical / Overhead Push
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| **Machine Shoulder Press** | Sh Flex, Sh Abd, Elb Ext, Scap UR | C | ✗ | H | H | Selectorized, Plate-Loaded | Nippard A+ for front delts |
| **Free-Weight Overhead Press** | Sh Flex, Sh Abd, Elb Ext, Scap UR | C | ✓ | M | H | DB, BB, Smith | Nippard: seated DB A-tier |
| Close-Grip Press | Elb Ext, Sh Flex, Sh HAdd | C | ✓ | M | H | BB, Smith JM, BB JM | Nippard A-tier compound triceps |
| Triceps Dip (Vertical) | Elb Ext, Sh Flex, Sh Add | C | ✓ | M | H | Dip Machine, Parallel Bars, Assisted | Israetel: vertical-torso narrow grip |

### Upper Body Pull

#### Lat-Biased
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Lat Pulldown | Sh Add, Elb Flex, Scap DR, **Scap Dep** | C | ✓ | H | VH | Cable Wide, Cable Neutral, Single-Arm, Machine | Nippard S-tier |
| Single-Arm Cable Pulldown | Sh Add, **Scap Dep** | I | ✓ | H | VH | Cable Single Handle, Cable Rope | Pure lat (minimal elbow flex) |
| Dumbbell Row (Elbow-Tucked) | Sh Ext, Elb Flex, **Scap Elev** | C | ✓ | M | H | DB on Bench, DB Standing | Tucked elbow = lat focus |
| Straight-Arm Pulldown / Lat Prayer | Sh Ext, **Scap Dep** | I | ✓ | H | VH | Cable Rope, Cable Bar, Band, Machine Pullover | Israetel: deep lat stretch |
| Pullover | Sh Ext, Sh Add, **Scap Dep** | I | ✓ | M | H | Cable, DB, Machine | Better as lat than chest |

#### Upper Back & Rhomboid
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Chest-Supported Row | Sh Ext, Scap Retr, Elb Flex | C | ✓ | H | VH | T-Bar, Machine, Incline DB, Seal | Nippard: best all-around back |
| Cable Row (Elbow-Flared) | Sh HAbd, Scap Retr, Elb Flex | C | ✓ | H | VH | Seated, Wide-Grip, Single-Arm | Wide-elbow path = mid-back |
| Barbell Row | Sh Ext, Scap Retr, Elb Flex, Sp Ext, **Scap Elev** | C | ✓ | L | M | BB, Deficit Pendlay, Yates | Nippard A-tier deficit Pendlay |
| Meadows Row | Sh Ext, Scap Retr, Elb Flex, **Scap Elev** | C | ✓ | M | H | Landmine, T-Bar, One-Arm BB | Nippard S-tier; isolateral |
| Inverted Row to Face/Throat | Sh HAbd, Scap Retr, Elb Flex | C | ✗ | M | H | Smith, BB Rack, TRX | Israetel: rear-delt-heavy row |
| Single-Arm DB Row (Elbow-Flared) | Sh HAbd, Scap Retr, Elb Flex, **Scap Elev** | C | ✓ | M | H | DB on Bench, DB Standing | Flared elbow = mid-back focus |
| Cable Face Pull (Rhomboid) | Sh HAbd, Scap Retr, Elb Flex | C | ✓ | M | H | Cable Rope, Cable Bar | Mid-back biased face pull |

#### Bicep-Biased Pull
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Pull-Up / Chin-Up | Sh Add, Sh Ext, Elb Flex, Scap DR, **Scap Dep** | C | ✓ | M | H | BW, Weighted, Assisted, Underhand, Neutral | Israetel: unbeatable for lats |
| Supinated Pulldown | Sh Add, Elb Flex | C | ✓ | H | H | Cable Underhand, Machine Underhand | — |
| Supinated Row | Sh Ext, Elb Flex, Scap Retr | C | ✓ | H | H | Cable, BB, Machine | — |

---

## Tier 2 — Regional / Single-Joint

### Arm Isolation

#### Biceps — Lengthened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Bayesian Curl | Elb Flex | I | ✓ | H | VH | Cable Single, Bilateral, FreeMotion | Nippard's #1 biceps |
| Incline Curl | Elb Flex | I | ✓ | M | H | DB, Cable | A-tier deep stretch |
| Lying / Flat-Bench Curl | Elb Flex | I | ✓ | M | H | DB Clown, Low-Cable Lying, Decline-Bench | Israetel: hard biceps stretch |

#### Biceps — Shortened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Preacher Curl | Elb Flex | I | ✓ | H | VH | DB, Machine, EZ-Bar, Cable | Nippard S-tier |
| Cable Curl | Elb Flex | I | ✗ | H | H | Standing, Superman/FreeMotion, EZ Cable | A-tier |
| Strict Curl | Elb Flex | I | ✗ | M | H | BB, EZ-Bar, DB | A-tier; clean progression |

#### Brachialis Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Hammer Curl | Elb Flex | I | ✗ | M | H | DB, Rope Cable, Machine, Cross-Body | Nippard A-tier |
| Preacher Hammer Curl | Elb Flex | I | ✓ | H | VH | DB, Machine, Cable | Nippard S-tier brachialis |
| Reverse Curl | Elb Flex | I | ✗ | M | M | EZ-Bar, BB, Cable, DB | Pronated grip biases brachialis |

#### Triceps — Long Head Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| EZ-Bar Overhead Triceps Extension | Elb Ext | I | ✓ | H | VH | EZ-Bar | Nippard S+ for long head |
| Cable Katana Extension | Elb Ext | I | ✓ | H | H | Single-Arm, Rope, Cuff | A-tier long-head cable |
| French Press | Elb Ext | I | ✓ | M | M | DB, EZ-Bar, Cable | Solid LH option |

#### Triceps — Lateral / Medial Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Triceps Pressdown | Elb Ext | I | ✗ | H | H | V-Bar, Straight Bar, Rope, Machine | Nippard A-tier |
| Skullcrusher | Elb Ext | I | ✓ | M | VH | BB, EZ-Bar, DB, Smith | Nippard S-tier |
| Cable Kickback | Elb Ext | I | ✗ | H | H | Single-Arm, Cuff, Machine | A-tier; cable beats DB |

### Shoulder Isolation

#### Medial Delt — Contracted Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Dumbbell Lateral Raise | Sh Abd | I | ✗ | M | M | Standing, Seated, Lean-In, Side-Lying | Lean-in highly ranked |
| Super-ROM Lateral Raise | Sh Abd | I | ✗ | M | M | DB, Cable, Machine | Israetel: broader delt dev |
| Machine Lateral Raise | Sh Abd | I | ✗ | H | H | Selectorized, Plate-Loaded, Atlantis | Nippard: Atlantis A+ |

#### Medial Delt — Stretch Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Cable Lateral Raise | Sh Abd | I | ✓ | H | VH | Single-Arm, Cuffed, BTB, Hand-Height | Nippard's #1 side-delt |
| Cable Y-Raise | Sh Abd, Scap UR | I | ✓ | H | H | Handles, Cuffs, Dual Cable | Nippard S-tier |
| Behind-the-Back Cuffed Cable Lateral | Sh Abd | I | ✓ | H | H | Cable Cuff, Single-Arm | Nippard S-tier |

#### Rear Delt
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Reverse Pec Deck | Sh HAbd | I | ✓ | H | VH | Pec Deck, Rear-Delt Machine | Nippard's best rear-delt |
| Reverse Cable Crossover | Sh HAbd | I | ✓ | H | VH | Handles, Cuffs, Cross-Body | Nippard S-tier |
| Face Pull | Sh ER, Sh HAbd, Scap Retr | I | ✗ | H | H | Cable Rope, Cable Bar, TRX | Israetel: rear-delt + cuff |

#### Front Delt Isolation
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Front Raise | Sh Flex | I | ✗ | M | L | DB, Cable, Plate, Machine | Nippard D-tier |

### Leg Isolation

#### Hamstrings — Lengthened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Seated Leg Curl | Knee Flex | I | ✓ | H | VH | Selectorized, Plate-Loaded | Nippard's #1 hamstring |

#### Hamstrings — Shortened Bias
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Prone / Standing Leg Curl | Knee Flex | I | ✗ | H | H | Lying, Standing, Cable Cuff | Israetel: complete ham dev |

#### Quadriceps Isolation (Rectus Femoris)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Leg Extension | Knee Ext | I | ✓ | H | VH | Selectorized, Plate-Loaded | Near-perfect quad iso |
| Reverse Nordic Curl | Knee Ext | I | ✓ | L | H | BW, Band-Assisted, Weighted | Massive quad stretch |
| Sissy Squat | Knee Ext | I | ✓ | L | M | BW, Sissy Bench, Cable/TRX-Assisted | Awkward but max stretch |

#### Calves
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Straight-Leg Calf Raise | Ank PF | I | ✓ | H | H | Belt Squat, Standing, Dip Belt, Leg Press | Israetel: deep loaded stretch |
| Seated Calf Raise | Ank PF | I | ✗ | H | H | Machine, DB on Knees, Smith | Israetel: useful soleus emphasis |

### Core Isolation

#### Upper Rectus Abdominis
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Abdominal Crunch Machine | Sp Flex | I | ✓ | H | VH | Selectorized, Plate-Loaded | Israetel: best ab option |
| Cable Crunch | Sp Flex | I | ✓ | H | H | Rope, Bar, Rounded Surface | Israetel: accessible & loadable |
| Inverted Bench Crunch | Sp Flex | I | ✓ | M | H | Decline Bench, Plate | — |

#### Lower Rectus / Hip Flexors
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| V-Up | Sp Flex, Hip Flex | I | ✗ | L | M | BW, Weighted, Bench | — |
| Ab Wheel Rollout | Sp Flex, Hip Flex | I | ✓ | L | H | Wheel, BB, Stability Ball | Israetel: phenomenal tension |

#### Obliques (Rotation & Lateral Flexion)
| Exercise | Joint Actions | C/I | Stretch | Stab | SFR | Equipment | Coach Note |
|---|---|---|---|---|---|---|---|
| Cable Woodchop | Sp Rot | I | ✗ | M | M | D-Handle, Rope (+ angle toggle: high/low/horizontal) | Standard rotational |
| Pallof Press | Sp Rot | I | ✗ | H | M | Cable, Band | Anti-rotation |
| Weighted Side Bend | Sp Rot | I | ✓ | M | M | DB, Cable | — |

---

## Coverage at a glance

| Joint Action | Coverage | Top picks |
|---|---|---|
| Knee Extensors | ★★★ | Hack Squat, Leg Extension, Upright Squat |
| Knee Flexors | ★★ | Seated Leg Curl, Lying Leg Curl, RDL |
| Hip Extensors | ★★★ | Machine Hip Thrust, RDL, Long-Stride Lunge, Back Extension |
| Hip Adductors | ★ | Long-Stride Lunge, FFE Lunge (incidental) |
| Hip Abductors | ★★ | Toes-Spread Squat / Hack / Leg Press / Belt Squat (via stance toggle), Bulgarian Split Squat |
| Shoulder Horizontal Adductors | ★★★ | Machine Chest Press, Cable Fly, Incline Press |
| Shoulder Horizontal Abductors | ★★★ | Reverse Pec Deck, Reverse Cable Crossover, Cable Row |
| Shoulder Adductors | ★★ | Lat Pulldown, Pull-Up, Single-Arm Cable Pulldown |
| Shoulder Extensors | ★★★ | Chest-Supported Row, Lat Prayer, Pullover |
| Shoulder Abductors | ★★★ | Cable Lateral, Machine Lateral, BTB Cuff Cable |
| Shoulder Flexors | ★★ | Machine Shoulder Press, Incline Press |
| Shoulder External Rotators | ★ | Face Pull only |
| Scapular Retractors | ★★ | Chest-Supported Row, Cable Row, Face Pull |
| Scapular Protractors | ★ | Chest Press variants (incidental) |
| Scapular Elevators | ★★ | RDL, Conventional DL, Barbell Row, Meadows Row, Single-Arm DB Rows |
| Scapular Depressors | ★★ | Lat Pulldown, Pull-Up, Single-Arm Cable Pulldown, Lat Prayer, Pullover |
| Scapular Upward Rotators | ★ | Cable Y-Raise, Machine Shoulder Press |
| Scapular Downward Rotators | ★★ | Lat Pulldown, Pull-Up |
| Elbow Flexors | ★★★ | Bayesian, Preacher, Lat Pulldown |
| Elbow Extensors | ★★★ | Overhead Tri Ext, Skullcrusher, Pressdown |
| Spinal Flexors | ★★★ | Crunch Machine, Cable Crunch, Inverted Bench Crunch |
| Spinal Extensors | ★★ | Back Extension, RDL, Good Morning |
| Spinal Rotators & Lateral Flexors | ★★ | Woodchop, Pallof, Side Bend |
| Hip Flexors | ★ | V-Up, Ab Wheel (incidental) |
| Hip External Rotators | ★★ | Toes-Spread Squat / Hack / Leg Press / Belt Squat (via stance toggle), Bulgarian Split Squat |
| Hip Internal Rotators | ★ | Bulgarian Split Squat / Lunges (incidental) |
| Ankle Plantarflexors | ★★ | Standing Calf Raise, Seated Calf Raise |

**Remaining gaps** (light penalty in rating):

- Shoulder External Rotators — Face Pull is the only pick. Could add a Cable External Rotation if wanted.
- Scapular Protractors — only incidentally trained (every chest press involves protraction at lockout). Could add a Serratus Punch.
- Hip Adductors as direct isolation — covered incidentally via lunges and any unilateral lift; no dedicated machine pick.

The rating engine penalizes these lightly because they're either covered indirectly or are minor stabilizers.
