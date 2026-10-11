import { expect, test, type Page } from "@playwright/test";
import { car, collectErrors, holdKeyUntil, startGame } from "./helpers";

/**
 * V9 destructible world, driven for real: the car is aimed at a street lamp,
 * a planter and a bench and the W key is held until contact. Nothing is
 * injected; the reactions (rattle, shove, knock-over), the live colliders,
 * the HUD and the rendered pixels are all observed through the read-only probe.
 */
type P = { id: number; category: string; x: number; z: number; rotation: number; dist: number };
const nearest = (page: Page, x: number, z: number, category: string): Promise<P> => page.evaluate(({ x, z, category }) => window.__pauWorld!.props.nearest(x, z, category as never)!, { x, z, category });
const phase = (page: Page, id: number) => page.evaluate((id) => window.__pauWorld!.props.state(id).phase, id);
const state = (page: Page, id: number) => page.evaluate((id) => window.__pauWorld!.props.state(id), id);
const position = (page: Page, id: number) => page.evaluate((id) => window.__pauWorld!.props.position(id), id);
const collider = (page: Page, id: number) => page.evaluate((id) => window.__pauWorld!.props.collider(id), id);

/** Place the car on the line toward the prop, `gap` units before contact (v at contact ≈ sqrt(32·gap) from rest). */
async function aimAt(page: Page, prop: { x: number; z: number }, from: [number, number], contact: number, gap: number) {
  const dx = prop.x - from[0];
  const dz = prop.z - from[1];
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  const d = contact + gap;
  const start: [number, number] = [prop.x - ux * d, prop.z - uz * d];
  await page.evaluate(({ x, z, h }) => window.__pauWorld!.teleport(x, z, h), { x: start[0], z: start[1], h: Math.atan2(ux, uz) });
  await page.waitForTimeout(300);
  return { ux, uz, start };
}

const twoFrames = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

async function capture(page: Page, p: { x: number; z: number }, height = 2.6) {
  await page.evaluate(({ x, z, height }) => window.__pauWorld!.photo({ position: [x + 6, height + 1.5, z + 4.5], target: [x, height * 0.5, z], fov: 44 }), { x: p.x, z: p.z, height });
  await page.waitForTimeout(500);
  await twoFrames(page);
  const png = await page.screenshot({ clip: { x: 300, y: 120, width: 680, height: 460 } });
  await page.evaluate(() => window.__pauWorld!.photo(null));
  return png.toString("base64");
}
async function meanDiff(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate(async ({ a, b }) => {
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = `data:image/png;base64,${src}`;
      });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = document.createElement("canvas");
    c.width = ia.width;
    c.height = ia.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(ia, 0, 0);
    const da = ctx.getImageData(0, 0, c.width, c.height).data;
    ctx.drawImage(ib, 0, 0);
    const db = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < da.length; i += 4) sum += Math.abs(da[i]! - db[i]!) + Math.abs(da[i + 1]! - db[i + 1]!) + Math.abs(da[i + 2]! - db[i + 2]!);
    return sum / (da.length / 4) / 3;
  }, { a, b });
}

test.describe("V9 destructible street furniture", () => {
  test.setTimeout(180_000);

  test("street lamp: a nudge rattles it and stops the car; a fast hit knocks it over, the car drives on and over it; reset puts it back", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("high", true));
    // The lamp on the east sidewalk of the south road, with open turf behind it.
    const lamp = await nearest(page, 4.8, 31.5, "lamp");
    expect(lamp.category).toBe("lamp");
    expect(Math.hypot(lamp.x - 4.8, lamp.z - 31.5)).toBeLessThan(1);
    expect(await phase(page, lamp.id)).toBe("standing");
    expect(await collider(page, lamp.id)).toMatchObject({ kind: "round" });
    const intact = await capture(page, lamp);

    // 1. Slow nudge from the road (≈ 3 u/s at contact): the post rattles, stays solid, the car bounces.
    await aimAt(page, lamp, [-2, lamp.z], 1.3 + 0.24, 0.3);
    const rattled = await holdKeyUntil(page, "KeyW", async () => (await phase(page, lamp.id)) !== "standing", 10_000);
    expect(rattled).toBe(true);
    expect(await phase(page, lamp.id)).toBe("wobbling");
    await expect(page.getByTestId("impact-toast")).toContainText("Street lamp rattled");
    const c0 = await car(page);
    expect(c0.x, "the car did not pass through the post").toBeLessThan(lamp.x - 1.3);
    await expect.poll(() => phase(page, lamp.id)).toBe("standing");

    // 2. Fast hit (≈ 11 u/s): knocked over away from the car, the car keeps going.
    await aimAt(page, lamp, [-2, lamp.z], 1.3 + 0.24, 4);
    const hit = await holdKeyUntil(page, "KeyW", async () => (await phase(page, lamp.id)) === "falling" || (await phase(page, lamp.id)) === "down", 15_000);
    expect(hit).toBe(true);
    const s = await state(page, lamp.id);
    expect(s.impact).toBeGreaterThanOrEqual(5);
    expect(s.dirX, "falls away from the car (+X)").toBeGreaterThan(0.8);
    expect(await collider(page, lamp.id), "no collider while down").toBeNull();
    await expect(page.getByTestId("impact-toast")).toContainText("Street lamp knocked over");
    await expect(page.getByTestId("reset-world")).toBeEnabled();
    await expect(page.getByTestId("reset-world")).toHaveAttribute("data-props-down", "1");
    // The post yielded: W a little longer and the car is past where it stood.
    const through = await holdKeyUntil(page, "KeyW", async () => (await car(page)).x > lamp.x + 0.5, 8_000);
    expect(through, "the car went through where the post stood").toBe(true);
    await expect.poll(() => phase(page, lamp.id), { timeout: 15_000 }).toBe("down");
    expect((await state(page, lamp.id)).angle).toBeGreaterThan(1.3);
    // A real visual change.
    await page.evaluate(() => window.__pauWorld!.teleport(0, 27, Math.PI));
    const down = await capture(page, lamp);
    expect(await meanDiff(page, intact, down)).toBeGreaterThan(3);

    // 3. The fallen post is no obstacle: drive straight over its place.
    await aimAt(page, lamp, [lamp.x, lamp.z - 6], 0, 2);
    const over = await holdKeyUntil(page, "KeyW", async () => (await car(page)).z > lamp.z + 2, 10_000);
    expect(over).toBe(true);

    // 4. Reset world: the lamp is back, solid, and looks as before.
    await page.evaluate(() => window.__pauWorld!.teleport(0, 27, Math.PI));
    await page.getByTestId("reset-world").click();
    await expect.poll(() => phase(page, lamp.id), { timeout: 10_000 }).toBe("standing");
    expect(await collider(page, lamp.id)).toMatchObject({ kind: "round" });
    await expect(page.getByTestId("reset-world")).toBeDisabled();
    expect(await meanDiff(page, intact, await capture(page, lamp))).toBeLessThan(3);
    expect(errors(), "no console errors").toEqual([]);
  });

  test("planter: a medium hit shoves it along the push and it stays solid where it now stands; a hard hit tips it over", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // Plaza planter at 22.5°, approached from outside the plaza toward the centre.
    const planter = await nearest(page, 14.9, 6.2, "planter");
    expect(planter.category).toBe("planter");
    const p0 = await position(page, planter.id);
    const toCentre: [number, number] = [planter.x * 2, planter.z * 2]; // a point beyond, on the radial line outward
    const { ux, uz } = await aimAt(page, planter, toCentre, 1.3 + 0.95, 1.0); // ≈ 5.7 u/s at contact
    const shoved = await holdKeyUntil(page, "KeyW", async () => (await phase(page, planter.id)) !== "standing", 10_000);
    expect(shoved).toBe(true);
    expect(await phase(page, planter.id)).toBe("shoved");
    await expect(page.getByTestId("impact-toast")).toContainText("Planter shoved");
    await expect.poll(() => phase(page, planter.id), { timeout: 10_000 }).toBe("standing");
    const p1 = await position(page, planter.id);
    const moved = (p1.x - p0.x) * ux + (p1.z - p0.z) * uz;
    expect(moved, "slid along the push").toBeGreaterThan(0.15);
    expect(moved).toBeLessThanOrEqual(1.2 + 1e-6);
    const col = await collider(page, planter.id);
    expect(col).toMatchObject({ kind: "obb", rotation: planter.rotation });
    expect(col!.x).toBeCloseTo(p1.x, 5);
    const c0 = await car(page);
    // The car is held outside the moved box: its centre is at least (0.95 + 1.3) · cos45° away along the push, roughly.
    expect((p1.x - c0.x) * ux + (p1.z - c0.z) * uz).toBeGreaterThan(1.9);

    // Hard hit from further back (≈ 11 u/s): tipped over, the car ploughs through.
    await aimAt(page, { x: p1.x, z: p1.z }, toCentre, 1.3 + 0.95, 4);
    const tipped = await holdKeyUntil(page, "KeyW", async () => ["falling", "down"].includes(await phase(page, planter.id)), 15_000);
    expect(tipped).toBe(true);
    await expect(page.getByTestId("impact-toast")).toContainText("Planter knocked over");
    expect(await collider(page, planter.id)).toBeNull();
    const through = await holdKeyUntil(page, "KeyW", async () => {
      const c1 = await car(page);
      return (c1.x - p1.x) * ux + (c1.z - p1.z) * uz > 0.5;
    }, 8_000);
    expect(through, "the car passed the planter's place").toBe(true);
    await expect.poll(() => phase(page, planter.id), { timeout: 15_000 }).toBe("down");
    await page.evaluate(() => window.__pauWorld!.teleport(0, 27, Math.PI));
    await page.getByTestId("reset-world").click();
    await expect.poll(() => phase(page, planter.id), { timeout: 10_000 }).toBe("standing");
    const p2 = await position(page, planter.id);
    expect(Math.hypot(p2.x - p0.x, p2.z - p0.z), "back where it was placed").toBeLessThan(1e-6);
    expect(errors()).toEqual([]);
  });

  test("bench: it blocks a creeping car, a fast car flips it and drives on; buildings and trees still behave", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // Plaza bench at 67.5°, approached radially from outside.
    const bench = await nearest(page, 6.2, 14.9, "bench");
    expect(bench.category).toBe("bench");
    const outward: [number, number] = [bench.x * 2, bench.z * 2];
    await aimAt(page, bench, outward, 1.3 + 0.3, 0.3);
    const touched = await holdKeyUntil(page, "KeyW", async () => (await phase(page, bench.id)) !== "standing", 10_000);
    expect(touched).toBe(true);
    expect(["wobbling", "shoved"]).toContain(await phase(page, bench.id));
    expect(await collider(page, bench.id)).toMatchObject({ kind: "obb", hx: 0.85, hz: 0.3 });
    await expect.poll(() => phase(page, bench.id), { timeout: 10_000 }).toBe("standing");
    const p1 = await position(page, bench.id);
    // Flip it: ≈ 9 u/s at contact.
    await aimAt(page, p1, outward, 1.3 + 0.3, 2.6);
    const flipped = await holdKeyUntil(page, "KeyW", async () => ["falling", "down"].includes(await phase(page, bench.id)), 15_000);
    expect(flipped).toBe(true);
    await expect(page.getByTestId("impact-toast")).toContainText("Bench knocked over");
    expect(await collider(page, bench.id)).toBeNull();
    await expect.poll(() => phase(page, bench.id), { timeout: 15_000 }).toBe("down");
    const summary = await page.evaluate(() => window.__pauWorld!.props.summary());
    expect(summary.down).toBe(1);
    expect(summary.active).toEqual(["lamp", "planter", "bench", "bollard", "bush", "signpost", "mast"]);
    // The Central Hub remains a rigid obstacle and the probe's collider list is the static set.
    const kinds = await page.evaluate(() => window.__pauWorld!.debug.obstacles().map((o) => o.kind));
    expect(kinds).toContain("round");
    expect(kinds).toContain("box");
    await page.evaluate(() => window.__pauWorld!.teleport(0, 20, Math.PI));
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(2500);
    await page.keyboard.up("KeyW");
    const c = await car(page);
    expect(Math.hypot(c.x, c.z)).toBeGreaterThan(5.5);
    // The debug overlay switches on and off through the probe only and never throws.
    await page.evaluate(() => window.__pauWorld!.debug.colliders(true));
    await twoFrames(page);
    await page.evaluate(() => window.__pauWorld!.debug.colliders(false));
    await twoFrames(page);
    expect(errors()).toEqual([]);
  });

  test("bollard, bush and signpost (iteration 4): each holds a creeping car, each gives way to a fast one in its own way", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.evaluate(() => window.__pauWorld!.setQuality("low", true));
    // The inner bollard of the plaza's south exit (east side), approached from the road heading east: the lamp
    // beside the outer bollard (0.7 u away, GEO-04) stays clear of this line.
    const bollard = await nearest(page, 4.4, 17.7, "bollard");
    expect(bollard.category).toBe("bollard");
    await aimAt(page, bollard, [bollard.x - 8, bollard.z], 1.3 + 0.16, 0.3);
    expect(await holdKeyUntil(page, "KeyW", async () => (await phase(page, bollard.id)) !== "standing", 10_000)).toBe(true);
    expect(await phase(page, bollard.id)).toBe("wobbling");
    expect((await car(page)).x, "held outside the bollard").toBeLessThan(bollard.x - 1.3);
    await expect.poll(() => phase(page, bollard.id), { timeout: 10_000 }).toBe("standing");
    await aimAt(page, bollard, [bollard.x - 8, bollard.z], 1.3 + 0.16, 2.5);
    expect(await holdKeyUntil(page, "KeyW", async () => ["falling", "down"].includes(await phase(page, bollard.id)))).toBe(true);
    // The event itself (the toast can be overwritten by the next contact a frame later).
    const knocks = await page.evaluate(() => window.__pauWorld!.props.events().filter((e) => e.type === "knock"));
    expect(knocks.some((e) => e.id === bollard.id && e.impact >= 4), "a knock event with impact ≥ 4 u/s").toBe(true);
    expect(await collider(page, bollard.id)).toBeNull();

    // A garden bush: flattened at speed, the car keeps rolling through it.
    const bush = await nearest(page, -24, 28, "bush");
    expect(bush.category).toBe("bush");
    await aimAt(page, bush, [bush.x + 6, bush.z], 1.3 + 0.6, 2.0);
    const flattened = await holdKeyUntil(page, "KeyW", async () => (await phase(page, bush.id)) === "down");
    expect(flattened).toBe(true);
    expect((await state(page, bush.id)).squash).toBeLessThan(0.3);
    const flattens = await page.evaluate(() => window.__pauWorld!.props.events().filter((e) => e.type === "flatten"));
    expect(flattens.some((e) => e.id === bush.id), "a flatten event for this bush (the toast may be overwritten by the next contact)").toBe(true);
    expect(await collider(page, bush.id)).toBeNull();
    const through = await holdKeyUntil(page, "KeyW", async () => (await car(page)).x < bush.x - 0.5);
    expect(through, "drove through the flattened bush").toBe(true);

    // The plaza's south signpost: heavy, falls only from a fast hit; its panels go with the post.
    const sign = await nearest(page, 6.7, 20, "signpost");
    expect(sign.category).toBe("signpost");
    await aimAt(page, sign, [sign.x, sign.z + 8], 1.3 + 0.2, 0.3);
    expect(await holdKeyUntil(page, "KeyW", async () => (await phase(page, sign.id)) !== "standing", 10_000)).toBe(true);
    expect(await phase(page, sign.id)).toBe("wobbling");
    await expect.poll(() => phase(page, sign.id), { timeout: 10_000 }).toBe("standing");
    await aimAt(page, sign, [sign.x, sign.z + 9], 1.3 + 0.2, 3.5);
    await page.evaluate(() => {
      window.__pauWorld!.debug.telemetry(true);
      window.__pauWorld!.debug.clearLog();
    });
    const signFell = await holdKeyUntil(page, "KeyW", async () => ["falling", "down"].includes(await phase(page, sign.id)));
    if (!signFell) {
      const samples = await page.evaluate(() => window.__pauWorld!.debug.samples(400));
      const contacts = await page.evaluate(() => window.__pauWorld!.debug.contactLog(20));
      const events = await page.evaluate(() => window.__pauWorld!.props.events());
      throw new Error(`signpost did not fall. phase ${await phase(page, sign.id)}; events ${JSON.stringify(events.slice(-8))}; contacts ${JSON.stringify(contacts.map((c) => [c.what, c.x0.toFixed(1), c.z0.toFixed(1), c.speedBefore.toFixed(1), c.reason]))}\n${samples.filter((_, i) => i % 3 === 0).map((v) => `${v.t.toFixed(2)} x=${v.x.toFixed(1)} z=${v.z.toFixed(1)} v=${v.speed.toFixed(1)} th=${v.throttle} ${v.blocked ? "BLK" : ""}`).join("\n")}`);
    }
    await expect(page.getByTestId("impact-toast")).toContainText("Signpost knocked over");
    await expect.poll(() => phase(page, sign.id), { timeout: 15_000 }).toBe("down");
    const summary = await page.evaluate(() => window.__pauWorld!.props.summary());
    expect(summary.active).toEqual(["lamp", "planter", "bench", "bollard", "bush", "signpost", "mast"]);
    expect(summary.down).toBeGreaterThanOrEqual(3);
    await page.evaluate(() => window.__pauWorld!.teleport(0, 27, Math.PI));
    await page.getByTestId("reset-world").click();
    await expect.poll(() => phase(page, sign.id), { timeout: 10_000 }).toBe("standing");
    await expect.poll(() => phase(page, bush.id), { timeout: 10_000 }).toBe("standing");
    expect(errors()).toEqual([]);
  });
});
