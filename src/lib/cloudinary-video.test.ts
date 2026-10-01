import { describe, it, expect } from "vitest";
import { cloudinaryVideoUrl, cloudinaryVideoPoster } from "./cloudinary";

const u = "https://res.cloudinary.com/demo/video/upload/v1727/ruderegez/products/abc.mov";

describe("product video URLs", () => {
  it("delivers the video re-encoded and capped at 1080px", () => {
    expect(cloudinaryVideoUrl(u)).toBe(
      "https://res.cloudinary.com/demo/video/upload/f_auto,q_auto,w_1080,c_limit/v1727/ruderegez/products/abc.mov",
    );
  });

  it("makes a JPG poster from the first frame", () => {
    expect(cloudinaryVideoPoster(u, { width: 160 })).toBe(
      "https://res.cloudinary.com/demo/video/upload/so_0,f_jpg,q_auto,w_160/v1727/ruderegez/products/abc.jpg",
    );
  });
});
