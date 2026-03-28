import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import Navbar from "../components/landing/Navbar";
import { renderWithRouter } from "./test-utils";

vi.mock("../hooks/useNavbarScrollState", () => ({
  default: () => false,
}));

vi.mock("../hooks/useLandingSectionScroll", () => ({
  useLandingSectionNavigation: () => vi.fn(),
}));

describe("Landing branding", () => {
  test("navbar logo advertises the mobile-sized asset hint", () => {
    renderWithRouter(<Navbar />);

    const homeLogo = screen.getByRole("link", { name: /EcoTrack home/i }).querySelector("img");

    expect(homeLogo).toHaveAttribute("sizes", "28px");
  });
});
