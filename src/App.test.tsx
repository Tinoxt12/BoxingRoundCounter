import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { HashRouter } from "react-router-dom";

describe("application shell", () => {
  it("shows the app name and main navigation", () => {
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    );

    expect(screen.getByRole("link", { name: "Scorecard" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fights" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Cards" })).toBeInTheDocument();
  });
});
