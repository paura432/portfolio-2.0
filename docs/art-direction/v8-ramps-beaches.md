# V8 · Ramps, beaches and the marine form

## Ramps

Launch structures, not inclined blocks. A composite deck (eleven tilted plates following the exact `rampHeightAt` profile the car climbs) in dark steel with lighter plates down the centre, on steel legs every 3.2 u, cyan edge strips along both sides, rails on posts, chevrons painted on the approach, two masts with amber heads at the entry, a sign ("WEST CITY RAMP · Takeoff · ≥ 40 km/h") and an amber light bar on the lip. Same materials library as the Skyport (`metalDark`, `concreteLight`, `metal`, `lightCyanSoft`, `lightAmber`, `roadLine`); no new textures. The Skyport Ramp reads as the runway's launch deck: the whole strip is its approach.

## Beaches

The coast skirt opens into a bay: the coastline polygon bulges out to the beach's outer corners with shoulders beside the sand (so the bulge never cuts across a pier), the skirt faces inside the band are left out, and a sand strip mesh (`buildBeachTerrain`) takes their place, coloured by depth: dry sand `#5E5744`, wet sand `#45453C` at the waterline, `#2C3A46` under the shallows, the sea-floor tone beyond. The strip reaches 1 u past the band on each side to meet the skirt. The water surface crosses the slope on its own, so the shoreline, the foam band and the shallow colour of the V6 ocean shader fall where the sand goes under. No rocks, trees or benches on a beach or in a ramp corridor (`isFreeGround`).

## PAU TRANSFORMER-X, marine form

Everything the car and the AERO-X are stays. The marine parts are part of the same mesh, folded against the body:

| Part | Folded | Deployed |
|---|---|---|
| Side floats (two navy pontoons with a cyan strip and a nose cone) | flat along each flank under the belt line, on a hinge arm | swung 72° down and out: the pontoons sit at the waterline either side of the body |
| Keel plate | inside the underbody | lowered 0.32 u: a navy hull under the car with a bow wedge |
| Stern jet | hidden | a dark nozzle with a cyan ring at the rear, glowing with the throttle |
| Wheels | out | tucked 0.24 u into the arches |
| Side panels | closed | open (shared with the wing deployment) |

The body sinks 0.5 u when afloat so the floats take the waterline and the wheels sit under the water; buoyancy (height, pitch, roll) is the V6 point-sampled model on the same wave function the shader renders, and the wake trail starts from the stern once the floats are 40 % out. The transformation is a staged, eased progress in both directions, FPS-independent, with no geometry created per frame; reduced motion removes only the mechanical shudder.
