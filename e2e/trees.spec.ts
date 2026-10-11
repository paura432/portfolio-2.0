import { expect, test, type Page } from "@playwright/test";
import { car, collectErrors, holdKeyUntil, startGame } from "./helpers";

/**
 * Destructible trees, driven for real: the car is placed on the road near a
 * boulevard tree and the W key is held until the trunk gives way. No state is
 * injected; everything below is observed through the read-only probe and the
 * rendered pixels.
 */
type TreeInfo = { id: number; x: number; z: number; kind: string };

const target = async (page: Page): Promise<TreeInfo> => page.evaluate(() => window.__pauWorld!.trees.nearest(-7.3, 29)!);
const phase = (page: Page, id: number) => page.evaluate((id) => window.__pauWorld!.trees.state(id).phase, id);
const state = (page: Page, id: number) => page.evaluate((id) => window.__pauWorld!.trees.state(id), id);

/** Place the car on the road, aimed at the tree, `runUp` units before contact (v ≈ sqrt(32·runUp)). */
async function aimAt(page: Page, tree: TreeInfo, start: [number, number]) {
  const vx = tree.x - start[0];
  const vz = tree.z - start[1];
  await page.evaluate(({ x, z, h }) => window.__pauWorld!.teleport(x, z, h), { x: start[0], z: start[1], h: Math.atan2(vx, vz) });
  await page.waitForTimeout(300);
}

/** Two rendered frames (R3F renders on rAF): under software rendering a fixed delay may hold no frame at all. */
const twoFrames = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/** Fixed camera on the tree; mean pixel difference between two captures (0..255), computed in-page. */
async function captureTree(page: Page, tree: TreeInfo) {
  await page.evaluate(({ x, z }) => window.__pauWorld!.photo({ position: [x + 7, 3.4, z + 5], target: [x, 1.6, z], fov: 44 }), { x: tree.x, z: tree.z });
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

test.describe("destructible trees", () => {
  // Software rendering with the V7 scene runs under 2 fps; the tier cycle and the three capture comparisons need the room.
  test.setTimeout(150_000);
  test("drive into a tree: it falls, the car drives on, quality changes keep it down, reset regrows it", async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    // Software rendering trips the performance monitor; pin the tier so the HUD cycle below is deterministic.
    await page.evaluate(() => window.__pauWorld!.setQuality("high", true));
    const tree = await target(page);
    expect(tree.kind).toBe("tiered");
    expect(await phase(page, tree.id)).toBe("standing");
    const intact = await captureTree(page, tree);

    // 1–3. Fast approach from the road (≈ 20 u/s at contact): the trunk snaps.
    await aimAt(page, tree, [2, 18]);
    const hit = await holdKeyUntil(page, "KeyW", async () => (await phase(page, tree.id)) !== "standing", 20_000);
    expect(hit, "the tree reacted to the car").toBe(true);
    let s = await state(page, tree.id);
    expect(s.phase).toBe("falling");
    expect(s.broken, "a strong hit snaps the trunk").toBe(true);
    expect(s.impact).toBeGreaterThanOrEqual(13);
    // Falls away from the car: direction roughly the direction of travel.
    expect(s.dirX * (tree.x - 2) + s.dirZ * (tree.z - 18)).toBeGreaterThan(0);
    const c1 = await car(page);
    expect(c1.speed, "the car keeps moving after the impact").toBeGreaterThan(2);
    await expect(page.getByTestId("impact-toast")).toContainText("Trunk snapped");
    await expect(page.getByTestId("reset-world")).toBeEnabled();

    // 4–5. The fall is an animation: the angle grows over time, then it rests.
    const a0 = s.angle;
    await page.waitForTimeout(250);
    const a1 = (await state(page, tree.id)).angle;
    expect(a1).toBeGreaterThanOrEqual(a0);
    await expect.poll(() => phase(page, tree.id), { timeout: 15_000 }).toBe("fallen");
    s = await state(page, tree.id);
    expect(s.angle).toBeGreaterThan(1.1);
    // The neighbours in the same boulevard row are untouched.
    const neighbours = await page.evaluate((id) => {
      const d = window.__pauWorld!.trees.def(id)!;
      const out: string[] = [];
      for (let i = 0; i < 140; i++) {
        const o = window.__pauWorld!.trees.def(i)!;
        if (i !== id && Math.hypot(o.x - d.x, o.z - d.z) < 12) out.push(window.__pauWorld!.trees.state(i).phase);
      }
      return out;
    }, tree.id);
    expect(neighbours.length).toBeGreaterThan(0);
    expect(neighbours.every((p) => p === "standing")).toBe(true);

    // A real visual change: the fallen capture differs clearly from the intact one.
    await page.evaluate(() => window.__pauWorld!.teleport(0, 27, Math.PI)); // out of the frame
    const fallen = await captureTree(page, tree);
    expect(await meanDiff(page, intact, fallen)).toBeGreaterThan(4);

    // 6. The car still drives.
    const before = await car(page);
    expect(await holdKeyUntil(page, "KeyW", async () => (await car(page)).z < before.z - 2)).toBe(true);

    // 7–8. Quality cycles High → Medium → Low → High: the tree stays fallen with the same pose.
    const toggle = page.getByTestId("quality-toggle");
    for (const q of ["medium", "low", "high"]) {
      await toggle.click();
      await expect(toggle).toHaveAttribute("data-quality", q);
      await page.waitForTimeout(300);
      await twoFrames(page);
      const t = await state(page, tree.id);
      expect(t.phase, `still fallen at ${q}`).toBe("fallen");
      expect(t.angle).toBe(s.angle);
      expect(t.broken).toBe(true);
    }
    expect(await meanDiff(page, fallen, await captureTree(page, tree))).toBeLessThan(3);

    // 9–10. Reset world: the tree regrows at its original position and is solid again.
    await page.getByTestId("reset-world").click();
    await expect.poll(() => phase(page, tree.id), { timeout: 10_000 }).toBe("standing");
    await expect(page.getByTestId("reset-world")).toBeDisabled();
    const back = await state(page, tree.id);
    expect(back.angle).toBe(0);
    expect(back.broken).toBe(false);
    expect(await meanDiff(page, intact, await captureTree(page, tree))).toBeLessThan(3);
    // Slow nudge from the sidewalk: it only shakes and the car bounces off.
    await aimAt(page, tree, [-5.0, 27.8]);
    const bumped = await holdKeyUntil(page, "KeyW", async () => (await phase(page, tree.id)) !== "standing", 10_000);
    expect(bumped).toBe(true);
    expect(await phase(page, tree.id)).toBe("shaking");
    await expect.poll(() => phase(page, tree.id)).toBe("standing");
    expect((await state(page, tree.id)).angle).toBe(0);
    expect(errors()).toEqual([]);
  });

  test("buildings still block the car and the reset-car button leaves fallen trees alone", async ({ page }) => {
    await startGame(page);
    const tree = await target(page);
    await aimAt(page, tree, [-2.8, 25.0]);
    expect(await holdKeyUntil(page, "KeyW", async () => (await phase(page, tree.id)) !== "standing", 15_000)).toBe(true);
    const s = await state(page, tree.id);
    expect(s.phase).toBe("falling");
    expect(s.broken, "a medium hit topples without snapping").toBe(false);
    await page.getByTestId("reset-car").click();
    await expect.poll(() => car(page).then((c) => Math.abs(c.z - 27))).toBeLessThan(0.01);
    await expect.poll(() => phase(page, tree.id), { timeout: 15_000 }).toBe("fallen");
    // The Central Hub remains a rigid obstacle from the spawn.
    const reached = await holdKeyUntil(page, "KeyW", async () => Math.hypot((await car(page)).x, (await car(page)).z) < 10, 20_000);
    expect(reached).toBe(true);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(1500);
    await page.keyboard.up("KeyW");
    const c = await car(page);
    expect(Math.hypot(c.x, c.z)).toBeGreaterThan(5.5);
  });
});
