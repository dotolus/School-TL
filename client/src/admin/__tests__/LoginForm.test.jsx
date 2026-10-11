/** @vitest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { LoginForm } from "../LoginForm";
import { api } from "../../api";

vi.mock("../../api", () => ({ api: { login: vi.fn() } }));

describe("LoginForm", () => {
  it("shows an error and does not call onLoggedIn when the password is wrong", async () => {
    api.login.mockRejectedValueOnce(new Error("Wrong password"));
    const onLoggedIn = vi.fn();

    render(<LoginForm onLoggedIn={onLoggedIn} />);
    fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: "nope" } });
    fireEvent.click(screen.getByText("התחברות"));

    await waitFor(() => expect(screen.getByText("Wrong password")).toBeInTheDocument());
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("calls onLoggedIn when the password is accepted", async () => {
    api.login.mockResolvedValueOnce({ ok: true });
    const onLoggedIn = vi.fn();

    render(<LoginForm onLoggedIn={onLoggedIn} />);
    fireEvent.change(screen.getByLabelText("סיסמה"), { target: { value: "right" } });
    fireEvent.click(screen.getByText("התחברות"));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledTimes(1));
    expect(api.login).toHaveBeenCalledWith("right");
  });
});
