import { describe, expect, it } from "vitest";
import { shuffle } from "./util";

describe("shuffle", () => {
  it("keeps every item and does not change the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it("changes the order", () => {
    // Always picking 0 moves each item to the front in turn: a fixed, non-sorted order.
    expect(shuffle([1, 2, 3, 4, 5], () => 0)).toEqual([2, 3, 4, 5, 1]);
  });
});
