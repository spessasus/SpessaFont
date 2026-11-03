// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DragController, DROP_TARGET_ATTRIBUTE } from "./drag_controller.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";

function pointer(type: string, x: number, y: number, pointerType = "mouse") {
    return new PointerEvent(type, {
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
        pointerType
    });
}

function setUp(canDrop = true) {
    const controller = new DragController();
    const drop = vi.fn();
    controller.register("t", { accepts: () => canDrop, drop });
    const payload = {
        session: createTestSession(),
        entities: []
    };
    return { controller, drop, payload };
}

describe("DragController", () => {
    const target = document.createElement("div");
    target.setAttribute(DROP_TARGET_ATTRIBUTE, "t");
    const inner = document.createElement("span");
    target.append(inner);
    // jsdom has no layout, so the element under the pointer is always the inner one
    document.elementFromPoint = () => inner;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("starts after the pointer moves a few pixels and drops on the target", () => {
        const { controller, drop, payload } = setUp();
        controller.press(pointer("pointerdown", 10, 10), payload);
        controller.move(pointer("pointermove", 12, 11));
        expect(controller.getSnapshot()).toBeNull();

        controller.move(pointer("pointermove", 30, 10));
        expect(controller.getSnapshot()?.overId).toBe("t");

        controller.release();
        expect(controller.getSnapshot()).toBeNull();
        expect(drop).toHaveBeenCalledWith(payload);
    });

    it("leaves touch alone and a plain click does nothing", () => {
        const { controller, drop, payload } = setUp();
        controller.press(pointer("pointerdown", 10, 10, "touch"), payload);
        controller.move(pointer("pointermove", 80, 10, "touch"));
        expect(controller.getSnapshot()).toBeNull();

        controller.press(pointer("pointerdown", 10, 10), payload);
        controller.release();
        expect(drop).not.toHaveBeenCalled();
    });

    it("skips targets that refuse the payload, and cancels", () => {
        const { controller, drop, payload } = setUp(false);
        controller.press(pointer("pointerdown", 10, 10), payload);
        controller.move(pointer("pointermove", 40, 10));
        expect(controller.getSnapshot()?.overId).toBeUndefined();
        controller.cancel();
        controller.release();
        expect(drop).not.toHaveBeenCalled();
    });
});
